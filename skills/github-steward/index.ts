/**
 * github-steward skill - Repository stewardship and progressive autonomy
 *
 * Manages vault commits, PRs, and the transition from agent-led to
 * community-led governance.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

// Autonomy phases
export enum AutonomyPhase {
  AGENT_LED = 1,
  SHARED_CONTROL = 2,
  COLLABORATIVE = 3,
}

interface AutonomyState {
  phase: AutonomyPhase;
  commits_total: number;
  prs_merged: number;
  prs_rejected: number;
  steward_edits: number;
  last_activity: string;
}

// Load autonomy state from workspace
async function loadAutonomyState(): Promise<AutonomyState> {
  const statePath = '/workspace/memory/autonomy-state.json';
  try {
    const content = await fs.readFile(statePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Default state: Phase 1
    return {
      phase: AutonomyPhase.AGENT_LED,
      commits_total: 0,
      prs_merged: 0,
      prs_rejected: 0,
      steward_edits: 0,
      last_activity: new Date().toISOString(),
    };
  }
}

// Save autonomy state
async function saveAutonomyState(state: AutonomyState): Promise<void> {
  const statePath = '/workspace/memory/autonomy-state.json';
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
}

/**
 * Commit content directly to the vault repository
 */
export async function commit_to_vault(params: {
  path: string;
  content: string;
  message: string;
  create_if_missing?: boolean;
}): Promise<{
  success: boolean;
  sha?: string;
  url?: string;
  error?: string;
}> {
  const { path: filePath, content, message, create_if_missing = true } = params;
  const repo = process.env.GITHUB_REPO;

  if (!repo) {
    return { success: false, error: 'GITHUB_REPO not configured' };
  }

  // Check autonomy phase
  const state = await loadAutonomyState();
  if (state.phase !== AutonomyPhase.AGENT_LED) {
    return {
      success: false,
      error: `Direct commits disabled in Phase ${state.phase}. Use create_pr instead.`,
    };
  }

  try {
    // Clone or update local repo
    const workDir = '/workspace/vault';
    await ensureRepoCloned(repo, workDir);

    // Write file
    const fullPath = path.join(workDir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Check if file exists
    const exists = await fs
      .access(fullPath)
      .then(() => true)
      .catch(() => false);

    if (!exists && !create_if_missing) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    await fs.writeFile(fullPath, content);

    // Commit and push
    const commitMessage = formatCommitMessage(message, 'agent');
    await execAsync(`cd "${workDir}" && git add "${filePath}"`);
    await execAsync(
      `cd "${workDir}" && git commit -m "${commitMessage.replace(/"/g, '\\"')}"`
    );
    await execAsync(`cd "${workDir}" && git push`);

    // Get commit SHA
    const { stdout: sha } = await execAsync(
      `cd "${workDir}" && git rev-parse HEAD`
    );

    // Update state
    state.commits_total++;
    state.last_activity = new Date().toISOString();
    await saveAutonomyState(state);

    return {
      success: true,
      sha: sha.trim(),
      url: `${repo}/commit/${sha.trim()}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create a pull request with changes
 */
export async function create_pr(params: {
  title: string;
  description: string;
  changes: Array<{
    path: string;
    content: string;
    action: 'create' | 'update' | 'delete';
  }>;
  branch?: string;
}): Promise<{
  success: boolean;
  pr_number?: number;
  url?: string;
  branch?: string;
  error?: string;
}> {
  const { title, description, changes, branch: customBranch } = params;
  const repo = process.env.GITHUB_REPO;

  if (!repo) {
    return { success: false, error: 'GITHUB_REPO not configured' };
  }

  try {
    const workDir = '/workspace/vault';
    await ensureRepoCloned(repo, workDir);

    // Create branch
    const branchName =
      customBranch ||
      `agent/${title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 30)}-${Date.now()}`;

    await execAsync(`cd "${workDir}" && git checkout -b "${branchName}"`);

    // Apply changes
    for (const change of changes) {
      const fullPath = path.join(workDir, change.path);

      if (change.action === 'delete') {
        await fs.unlink(fullPath).catch(() => {});
        await execAsync(`cd "${workDir}" && git rm -f "${change.path}"`).catch(
          () => {}
        );
      } else {
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, change.content);
        await execAsync(`cd "${workDir}" && git add "${change.path}"`);
      }
    }

    // Commit
    const commitMessage = formatCommitMessage(title, 'agent');
    await execAsync(
      `cd "${workDir}" && git commit -m "${commitMessage.replace(/"/g, '\\"')}"`
    );

    // Push branch
    await execAsync(
      `cd "${workDir}" && git push -u origin "${branchName}"`
    );

    // Create PR using gh CLI
    const prBody = `${description}\n\n---\n*Created by Bioregional Agent*`;
    const { stdout } = await execAsync(
      `cd "${workDir}" && gh pr create --title "${title.replace(
        /"/g,
        '\\"'
      )}" --body "${prBody.replace(/"/g, '\\"')}" --head "${branchName}"`
    );

    // Parse PR URL from output
    const prUrl = stdout.trim();
    const prNumber = parseInt(prUrl.split('/').pop() || '0');

    // Return to main branch
    await execAsync(`cd "${workDir}" && git checkout main`);

    // Update state
    const state = await loadAutonomyState();
    state.last_activity = new Date().toISOString();
    await saveAutonomyState(state);

    return {
      success: true,
      pr_number: prNumber,
      url: prUrl,
      branch: branchName,
    };
  } catch (error) {
    // Try to return to main branch on error
    try {
      await execAsync(`cd "/workspace/vault" && git checkout main`);
    } catch {}

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get the current autonomy phase for this node
 */
export async function get_autonomy_phase(): Promise<{
  phase: number;
  phase_name: string;
  commits_total: number;
  prs_merged: number;
  steward_edits: number;
  recommendation: string;
}> {
  const state = await loadAutonomyState();

  const phaseNames = {
    [AutonomyPhase.AGENT_LED]: 'agent-led',
    [AutonomyPhase.SHARED_CONTROL]: 'shared-control',
    [AutonomyPhase.COLLABORATIVE]: 'collaborative',
  };

  let recommendation = '';
  if (state.phase === AutonomyPhase.AGENT_LED) {
    if (state.steward_edits >= 5) {
      recommendation =
        'Steward is actively engaged. Consider transitioning to Phase 2 (shared control).';
    } else {
      recommendation = `Continue in Phase 1 until steward makes ${5 - state.steward_edits} more direct edits.`;
    }
  } else if (state.phase === AutonomyPhase.SHARED_CONTROL) {
    if (state.prs_rejected >= 3) {
      recommendation =
        'Multiple PRs rejected. Consider transitioning to Phase 3 (collaborative).';
    } else {
      recommendation =
        'Continue creating PRs for steward review.';
    }
  } else {
    recommendation =
      'In collaborative mode. Suggest changes for steward to implement.';
  }

  return {
    phase: state.phase,
    phase_name: phaseNames[state.phase],
    commits_total: state.commits_total,
    prs_merged: state.prs_merged,
    steward_edits: state.steward_edits,
    recommendation,
  };
}

/**
 * Generate a summary of recent vault activity
 */
export async function generate_digest(params: {
  period?: 'daily' | 'weekly';
  format?: 'markdown' | 'plain' | 'html';
}): Promise<{
  period: string;
  summary: string;
  stats: {
    files_added: number;
    files_modified: number;
    contributors: string[];
  };
}> {
  const { period = 'weekly', format = 'markdown' } = params;
  const repo = process.env.GITHUB_REPO;

  if (!repo) {
    throw new Error('GITHUB_REPO not configured');
  }

  const workDir = '/workspace/vault';
  await ensureRepoCloned(repo, workDir);

  // Get date range
  const now = new Date();
  const since = new Date(
    now.getTime() - (period === 'daily' ? 1 : 7) * 24 * 60 * 60 * 1000
  );
  const sinceStr = since.toISOString().split('T')[0];

  // Get git log
  const { stdout: logOutput } = await execAsync(
    `cd "${workDir}" && git log --since="${sinceStr}" --pretty=format:"%h|%an|%s" --name-status`
  );

  // Parse log
  const commits = logOutput.split('\n\n').filter(Boolean);
  const stats = {
    files_added: 0,
    files_modified: 0,
    contributors: new Set<string>(),
  };

  const changes: string[] = [];

  for (const commit of commits) {
    const lines = commit.split('\n');
    if (lines.length === 0) continue;

    const [hash, author, message] = lines[0].split('|');
    stats.contributors.add(author);
    changes.push(`- ${message} (${author})`);

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('A')) stats.files_added++;
      if (line.startsWith('M')) stats.files_modified++;
    }
  }

  const periodStr = `${sinceStr} to ${now.toISOString().split('T')[0]}`;

  let summary = '';
  if (format === 'markdown') {
    summary = `# Vault Activity Digest\n\n**Period:** ${periodStr}\n\n`;
    summary += `## Summary\n- ${stats.files_added} files added\n- ${stats.files_modified} files modified\n`;
    summary += `- ${stats.contributors.size} contributors\n\n`;
    summary += `## Changes\n${changes.join('\n')}`;
  } else {
    summary = `Vault Activity Digest (${periodStr})\n\n`;
    summary += `${stats.files_added} files added, ${stats.files_modified} modified\n`;
    summary += `Contributors: ${Array.from(stats.contributors).join(', ')}\n\n`;
    summary += `Changes:\n${changes.join('\n')}`;
  }

  return {
    period: periodStr,
    summary,
    stats: {
      files_added: stats.files_added,
      files_modified: stats.files_modified,
      contributors: Array.from(stats.contributors),
    },
  };
}

/**
 * Suggest an improvement without committing
 */
export async function suggest_improvement(params: {
  path: string;
  suggestion: string;
  reason: string;
}): Promise<{
  suggestion_id: string;
  preview_url: string;
  apply_command: string;
}> {
  const { path: filePath, suggestion, reason } = params;

  // Store suggestion in workspace
  const suggestionId = `sug-${Date.now()}`;
  const suggestionsDir = '/workspace/memory/suggestions';
  await fs.mkdir(suggestionsDir, { recursive: true });

  await fs.writeFile(
    path.join(suggestionsDir, `${suggestionId}.json`),
    JSON.stringify({ filePath, suggestion, reason, created: new Date().toISOString() }, null, 2)
  );

  return {
    suggestion_id: suggestionId,
    preview_url: `[Suggestion stored locally - ID: ${suggestionId}]`,
    apply_command: `To apply: "Apply suggestion ${suggestionId}"`,
  };
}

// Helper functions

async function ensureRepoCloned(repo: string, workDir: string): Promise<void> {
  const exists = await fs
    .access(path.join(workDir, '.git'))
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    await fs.mkdir(workDir, { recursive: true });
    await execAsync(`git clone "${repo}" "${workDir}"`);
  } else {
    // Pull latest
    await execAsync(`cd "${workDir}" && git pull --rebase`);
  }
}

function formatCommitMessage(message: string, author: 'agent' | 'steward'): string {
  const authorLine =
    author === 'agent'
      ? 'Authored-by: Bioregional Agent <agent@opencivics.org>'
      : 'Authored-by: Steward';

  return `${message}\n\n${authorLine}`;
}

// Export all tools
export const tools = {
  commit_to_vault,
  create_pr,
  get_autonomy_phase,
  generate_digest,
  suggest_improvement,
};
