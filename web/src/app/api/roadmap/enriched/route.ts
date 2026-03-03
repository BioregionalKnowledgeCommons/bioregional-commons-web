import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

// Confirm with owocki if the external URL differs from this default.
// Set OWOCKIBOT_BOUNTY_BASE_URL env var to override (e.g. /api/bounty-board vs /bounties).
const OWOCKIBOT_BOUNTY_BASE_URL =
  process.env.OWOCKIBOT_BOUNTY_BASE_URL ?? 'https://www.owockibot.xyz/bounties';

function extractBountyId(bountyUrl: string): string | null {
  // Handle both /bounties/{id} and /api/bounty-board/{id} path patterns
  const match = bountyUrl.match(/\/(?:bounties|api\/bounty-board)\/([^/?#]+)/);
  return match ? match[1] : null;
}

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'public', 'roadmap-data.json');
    const raw = readFileSync(filePath, 'utf-8');
    const roadmap = JSON.parse(raw);

    // Enrich nodes that have bounty_url with live status from owockibot.xyz read API
    const bountyNodes: Array<{ bounty_url: string; metadata?: Record<string, unknown> }> =
      roadmap.nodes.filter((n: { bounty_url?: string }) => n.bounty_url);

    if (bountyNodes.length > 0) {
      await Promise.allSettled(
        bountyNodes.map(async (node) => {
          const bountyId = extractBountyId(node.bounty_url);
          if (!bountyId) return;

          try {
            const res = await fetch(`${OWOCKIBOT_BOUNTY_BASE_URL}/${bountyId}`, {
              headers: { Accept: 'application/json' },
              signal: AbortSignal.timeout(5000),
            });
            if (!res.ok) return;
            const data = await res.json();

            // Merge live bounty fields into node.metadata — never overwrite node content
            node.metadata = {
              ...node.metadata,
              ...(data.status !== undefined && { live_bounty_status: data.status }),
              ...(data.reward !== undefined && { live_bounty_reward: data.reward }),
              ...(data.completed_by !== undefined && { live_bounty_completed_by: data.completed_by }),
              ...(data.tx_hash !== undefined && { live_bounty_tx_hash: data.tx_hash }),
            };
          } catch {
            // Graceful degradation: if owockibot API is unreachable, return base roadmap unchanged
          }
        })
      );
    }

    return NextResponse.json(roadmap, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to load roadmap data: ${message}` },
      { status: 500 }
    );
  }
}
