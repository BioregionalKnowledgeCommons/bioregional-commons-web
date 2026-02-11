# github-steward Skill

Repository stewardship and progressive autonomy for knowledge commons management.

## Purpose

This skill enables the agent to commit content to the vault, create pull requests, and manage the transition from agent-led to community-led governance.

## Progressive Autonomy Model

The agent operates in three phases:

### Phase 1: Agent-Led
- Agent commits directly to main branch
- Generates daily/weekly digests for the steward
- Ideal for new commons with single maintainer

### Phase 2: Shared Control
- Agent creates PRs instead of direct commits
- Steward reviews and merges
- Agent explains each change in plain language

### Phase 3: Collaborative
- Agent suggests edits in chat
- Human makes final commit decisions
- Agent provides templates and guidance

## Tools

### `commit_to_vault`

Commit content directly to the vault repository.

**Parameters:**
- `path` (string, required): File path in the vault
- `content` (string, required): File content
- `message` (string, required): Commit message
- `create_if_missing` (boolean, optional): Create file if it doesn't exist

**Returns:**
```json
{
  "success": true,
  "sha": "abc123...",
  "url": "https://github.com/owner/repo/commit/abc123"
}
```

### `create_pr`

Create a pull request with changes.

**Parameters:**
- `title` (string, required): PR title
- `description` (string, required): PR description (markdown)
- `changes` (array, required): Array of file changes
  - `path`: File path
  - `content`: New content
  - `action`: "create" | "update" | "delete"
- `branch` (string, optional): Branch name (auto-generated if not provided)

**Returns:**
```json
{
  "success": true,
  "pr_number": 42,
  "url": "https://github.com/owner/repo/pull/42",
  "branch": "agent/add-water-policy-2024-02"
}
```

### `get_autonomy_phase`

Get the current autonomy phase for this node.

**Returns:**
```json
{
  "phase": 1,
  "phase_name": "agent-led",
  "commits_total": 47,
  "prs_merged": 0,
  "steward_edits": 3,
  "recommendation": "Continue in Phase 1 until steward makes 5+ direct edits"
}
```

### `generate_digest`

Generate a summary of recent vault activity.

**Parameters:**
- `period` (string, optional): "daily" | "weekly" (default: "weekly")
- `format` (string, optional): "markdown" | "plain" | "html"

**Returns:**
```json
{
  "period": "2024-02-03 to 2024-02-10",
  "summary": "...",
  "stats": {
    "files_added": 3,
    "files_modified": 12,
    "contributors": ["agent", "steward-1"]
  }
}
```

### `suggest_improvement`

Suggest an improvement without committing.

**Parameters:**
- `path` (string, required): File to improve
- `suggestion` (string, required): Suggested change
- `reason` (string, required): Why this improves the content

**Returns:**
```json
{
  "suggestion_id": "sug-123",
  "preview_url": "...",
  "apply_command": "Apply suggestion: sug-123"
}
```

## Configuration

Environment variables:
- `GITHUB_REPO`: Vault repository URL
- `GITHUB_TOKEN`: Personal access token (optional, uses `gh` CLI if not set)
- `AUTONOMY_PHASE`: Override phase (1, 2, or 3)

## Commit Message Format

```
<type>: <short description>

<longer description if needed>

Authored-by: <steward or agent>
Co-authored-by: Bioregional Agent <agent@opencivics.org>
```

Types: `add`, `update`, `fix`, `reorganize`, `archive`

## Phase Transition Triggers

**Phase 1 → Phase 2:**
- Steward makes 5+ direct edits
- OR steward explicitly requests PR-based workflow

**Phase 2 → Phase 3:**
- Steward rejects 3+ PRs with edits
- OR steward explicitly requests collaborative mode

**Phase 3 → Phase 2:**
- Steward explicitly requests more agent autonomy
- OR 30 days without steward engagement
