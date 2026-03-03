import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

export const dynamic = 'force-dynamic';

const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER ?? 'BioregionalKnowledgeCommons';
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME ?? 'bioregional-commons-web';
const ROADMAP_FILE_PATH = 'web/public/roadmap-data.json';

const MUTABLE_FIELDS = ['status', 'bounty_url', 'metadata', 'summary'] as const;
type MutableField = typeof MUTABLE_FIELDS[number];

const COALITION_OWNERS = ['owner.owocki', 'owner.todd', 'owner.aaron'];
const VALID_STATUSES = ['planned', 'in_progress', 'done'];

interface ProposeBody {
  node_id: string;
  changes: Record<string, unknown>;
  attribution: string;
  reason?: string;
}

export async function POST(request: NextRequest) {
  // Bearer token auth — multiple keys supported (one per agent)
  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');

  const isOwockibotKey =
    !!process.env.ROADMAP_PROPOSE_OWOCKIBOT_KEY &&
    token === process.env.ROADMAP_PROPOSE_OWOCKIBOT_KEY;
  const isAuthorized =
    token === process.env.ROADMAP_PROPOSE_API_KEY || isOwockibotKey;

  if (!isAuthorized || !token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: ProposeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  if (!body.node_id || !body.changes || !body.attribution) {
    return NextResponse.json(
      { error: 'node_id, changes, and attribution are required' },
      { status: 400 }
    );
  }

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json(
      { error: 'GitHub integration not configured' },
      { status: 503 }
    );
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // Read current file from GitHub API to avoid stale local state
  let currentJson: string;
  let fileSha: string;
  try {
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: ROADMAP_FILE_PATH,
      ref: 'main',
    });
    if (!('content' in fileData) || !fileData.content) {
      throw new Error('Unexpected response format from GitHub');
    }
    currentJson = Buffer.from(fileData.content, 'base64').toString('utf-8');
    fileSha = fileData.sha;
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to read roadmap from GitHub: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }

  const roadmap = JSON.parse(currentJson);
  const node = roadmap.nodes.find((n: { id: string }) => n.id === body.node_id);
  if (!node) {
    return NextResponse.json({ error: 'node not found' }, { status: 404 });
  }

  // Scope check: owockibot key can only update coalition-owned nodes
  if (isOwockibotKey && !COALITION_OWNERS.includes(node.owner)) {
    return NextResponse.json(
      { error: `scope not authorized for node owner '${node.owner}' — owockibot key is restricted to: ${COALITION_OWNERS.join(', ')}` },
      { status: 403 }
    );
  }

  // Validate status value if being changed
  if (body.changes.status && !VALID_STATUSES.includes(body.changes.status as string)) {
    return NextResponse.json(
      { error: `invalid status '${body.changes.status}' — valid values: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  // Apply changes (only allowed mutable fields)
  for (const [k, v] of Object.entries(body.changes)) {
    if (MUTABLE_FIELDS.includes(k as MutableField)) {
      node[k] = v;
    }
  }

  const newJson = JSON.stringify(roadmap, null, 2) + '\n';

  try {
    // Get main branch SHA
    const { data: refData } = await octokit.rest.git.getRef({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      ref: 'heads/main',
    });

    // Create proposal branch
    const safeBranch = body.node_id.replace(/\./g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    const branch = `propose/${safeBranch}/${Date.now()}`;
    await octokit.rest.git.createRef({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      ref: `refs/heads/${branch}`,
      sha: refData.object.sha,
    });

    // Commit updated roadmap-data.json
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: ROADMAP_FILE_PATH,
      message: `roadmap: update ${body.node_id} (via ${body.attribution})`,
      content: Buffer.from(newJson).toString('base64'),
      sha: fileSha,
      branch,
    });

    // Build PR body
    const changesPreview = Object.entries(body.changes)
      .map(([k, v]) => `- \`${k}\`: \`${JSON.stringify(v)}\``)
      .join('\n');
    const prBody = [
      '## Proposed changes',
      '',
      `**Node:** \`${body.node_id}\``,
      `**Attribution:** ${body.attribution}`,
      body.reason ? `**Reason:** ${body.reason}` : '',
      '',
      '### Changes',
      changesPreview,
      '',
      '> ⚠️ Review before merging — changes are applied to `roadmap-data.json` on merge.',
    ]
      .filter((line) => line !== undefined)
      .join('\n');

    // Open pull request
    const { data: pr } = await octokit.rest.pulls.create({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      title: `roadmap: update ${body.node_id} (via ${body.attribution})`,
      body: prBody,
      head: branch,
      base: 'main',
    });

    return NextResponse.json({ pr_url: pr.html_url, pr_number: pr.number });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to create proposal PR: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }
}
