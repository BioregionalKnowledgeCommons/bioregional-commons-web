# Contributing to the BKC Roadmap

The roadmap lives in `web/public/roadmap-data.json` — a typed JSON graph following the
[Semantic Roadmap schema](web/public/semantic-roadmap.context.json).

Human contributions: open a GitHub PR directly.
Authorized agents (owockibot, etc.): use the `/commons/api/roadmap/propose` endpoint (see below).

---

## Schema Quick Reference

Every node requires these fields:

| Field | Type | Values |
|-------|------|--------|
| `id` | string | Dot-separated: `kind.slug` e.g. `work.b2-graphrag-v1` |
| `kind` | enum | `outcome`, `initiative`, `work_item`, `decision`, `risk`, `milestone`, `metric` |
| `title` | string | Short imperative phrase |
| `summary` | string | 1-2 sentence description |
| `status` | enum | `planned`, `in_progress`, `done` |
| `priority` | enum | `P0`, `P1`, `P2` |
| `horizon` | enum | `0-30d`, `30-90d`, `90-180d`, `180-365d` |
| `owner` | string | `owner.darren`, `owner.benjamin`, `owner.owocki`, `owner.todd`, `owner.aaron` |

Optional fields:

| Field | Type | Notes |
|-------|------|-------|
| `tags` | string[] | Freeform topic tags |
| `source_docs` | string[] | Document paths or URLs that informed this node |
| `due_date` | string | ISO date `YYYY-MM-DD` |
| `github_url` | string | Link to tracking issue or PR |
| `bounty_url` | string | owockibot.xyz bounty URL (set by agent via propose endpoint) |
| `metadata` | object | Kind-specific data (e.g. `{ target, type }` for `metric` nodes) |

---

## Node Template

Copy-paste and fill in:

```json
{
  "id": "work.your-slug-here",
  "kind": "work_item",
  "title": "Short imperative title",
  "summary": "One or two sentences describing the work and why it matters.",
  "status": "planned",
  "priority": "P1",
  "horizon": "30-90d",
  "owner": "owner.darren",
  "tags": ["optional", "tags"],
  "github_url": "https://github.com/BioregionalKnowledgeCommons/bioregional-commons-web/issues/N"
}
```

---

## Edge Spec

Edges connect nodes with a typed relationship:

| Type | Meaning | Common use |
|------|---------|------------|
| `delivers` | Node A produces Node B | work → outcome |
| `depends_on` | A cannot start until B is done | sequencing |
| `mitigates` | A reduces a risk | risk management |
| `measures` | A tracks progress on B | metric → goal |
| `informs` | A provides context for B | research → work |
| `blocks` | A prevents B | hard blockers |
| `references` | A cites B | loose cross-reference |

Edge format:
```json
{ "from": "source.node-id", "to": "target.node-id", "type": "delivers" }
```

---

## Lane Assignment

| Lane ID | Label | Use for |
|---------|-------|---------|
| `header` | Outcomes & Milestones | Top-level goals, major milestones |
| `demo` | Demo & Operations | Live demo features, operational work |
| `kg` | Knowledge Plane | Knowledge graph, entity extraction |
| `security` | Trust & Governance | Auth, governance protocols |
| `capital` | Capital Loop | Funding, bounties, economic mechanisms |
| `swarm` | Swarm Coordination | Coalition partners (owocki/Todd/Aaron nodes) |
| `footer` | Planning | Meta-planning, process nodes |

Lane is determined by horizon assignment in `roadmap-layout.ts` — add `lane` overrides
there for coalition partner nodes.

---

## For Coalition Partners

If you're adding nodes for your own work (owocki, Todd, Aaron):

1. File a GitHub Issue in **your own repo** to track the work
2. Set `github_url` to that issue
3. Set `owner` to your owner ID (`owner.owocki`, `owner.todd`, or `owner.aaron`)
4. Open a PR here with your node(s) and edges added to `roadmap-data.json`

Or, if you have owockibot configured, use the propose endpoint (see below).

---

## Propose Endpoint (for Bot Contributors)

Authorized agents can propose roadmap updates without filesystem access:

```
POST https://45.132.245.30.sslip.io/commons/api/roadmap/propose
Authorization: Bearer {token — DM @darrenzal on Telegram to request}
Content-Type: application/json

{
  "node_id": "initiative.owocki-swarm-foundation",
  "changes": {
    "bounty_url": "https://www.owockibot.xyz/bounties/123",
    "status": "in_progress"
  },
  "attribution": "owockibot",
  "reason": "Bounty #123 created for Safe treasury setup"
}
```

**Scope rules:**
- `owner.owocki` key → can only update nodes owned by `owner.owocki`, `owner.todd`, or `owner.aaron`
- Master key → can update any node
- Mutable fields: `status`, `bounty_url`, `metadata`, `summary`

**Response:**
```json
{ "pr_url": "https://github.com/.../pull/12", "pr_number": 12 }
```

This opens a GitHub PR for human review. Changes are live after Darren merges.

---

## Live Bounty-Enriched Roadmap

```
GET https://45.132.245.30.sslip.io/commons/api/roadmap/enriched
```

Same as `/api/roadmap` but nodes with `bounty_url` are enriched with live status from
owockibot.xyz (public read API, no auth). Graceful degradation: if owockibot is
unreachable, returns base roadmap unchanged.

---

## Versioning

`version` in `roadmap-data.json` uses `MAJOR.MINOR.PATCH`:
- **PATCH**: status updates, bounty_url additions, minor summary edits
- **MINOR**: new nodes/edges, new lanes or columns
- **MAJOR**: schema changes, fundamental restructuring

Version bumps are human decisions made on PR merge — not auto-incremented by the propose endpoint.
