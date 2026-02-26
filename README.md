# Bioregional Commons Web

Interactive 3D web dashboard for the Bioregional Knowledge Commons (BKC) network. Displays live node health, federation arcs, entity data, and commons intake review across all KOI nodes.

**Live:** Runs on Octo server at `45.132.245.30`, port 3100, served via `commons-web.service`.

**GitHub:** [BioregionalKnowledgeCommons/bioregional-commons-web](https://github.com/BioregionalKnowledgeCommons/bioregional-commons-web)

## Architecture

Next.js 16 app with a **BFF (Backend-for-Frontend)** pattern. All KOI node communication happens server-side — the browser never contacts node APIs directly.

```
Browser  →  Next.js BFF routes  →  KOI node APIs (internal)
              /api/nodes/[nodeId]/*     127.0.0.1:8351 (Octo)
              /api/chat                 127.0.0.1:8355 (FR)
              /api/search               37.27.48.12:8351 (GV)
                                        202.61.242.194:8351 (CV)
```

**Key modules:**
- `web/src/lib/node-registry.server.ts` — Server-only node registry with internal URLs (never exposed to browser)
- `web/src/lib/bff-fetch.server.ts` — Hardened fetch with GET/POST, cache, timeout, stale fallback
- `web/src/lib/node-provider.ts` — `NodeProvider` interface (abstracts KOI API for future non-KOI peers)
- `web/src/lib/koi-node-provider.ts` — KOI implementation of `NodeProvider`

## Features

### Globe & Map
- Three.js 3D globe with live node markers and federation arcs
- Bioregion/ecoregion layer rendering
- Node health status indicators

### Knowledge Panel (5 tabs)
- **Overview** — Node info, holonic hierarchy, entity counts
- **Knowledge** — Entity browser with type filtering, subgraph traversal, graph visualization
- **Chat** — RAG-powered Q&A against node knowledge (per-node and global fan-out)
- **Commons** — Intake queue review: approve/reject shares, decision audit log, merge candidate resolution
- **Network** — Federation peer status (stub)

### BFF API Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/nodes/[nodeId]/health` | GET | Node health |
| `/api/nodes/[nodeId]/entities` | GET | List entities |
| `/api/nodes/[nodeId]/search` | GET | Search entities |
| `/api/nodes/[nodeId]/relationships` | GET | Entity relationships |
| `/api/nodes/[nodeId]/subgraph` | GET | BFS subgraph traversal |
| `/api/nodes/[nodeId]/query` | POST | Query intent detection |
| `/api/nodes/[nodeId]/chat` | POST | Per-node chat |
| `/api/nodes/[nodeId]/commons/intake` | GET | Commons intake queue |
| `/api/nodes/[nodeId]/commons/decide` | POST | Approve/reject share |
| `/api/nodes/[nodeId]/commons/decisions/[shareId]` | GET | Decision audit log |
| `/api/nodes/[nodeId]/commons/merge-candidates/[shareId]` | GET | Merge candidates |
| `/api/nodes/[nodeId]/commons/resolve-merges/[shareId]` | POST | Resolve merges |
| `/api/chat` | POST | Global chat (fan-out to all nodes) |
| `/api/search` | GET | Global search across all nodes |

## Development

```bash
cd web
npm install
npm run dev    # http://localhost:3000
```

Requires KOI nodes to be accessible at the URLs configured in `node-registry.server.ts`.

## Production Deployment

Runs as `commons-web.service` on the Octo server (`45.132.245.30`), port 3100.

```bash
# From local machine
cd /Users/darrenzal/projects/BioregionKnwoledgeCommons/bioregional-commons-web
git push origin main

# On server
ssh root@45.132.245.30 "cd /root/bioregional-commons-web && git pull origin main"
ssh root@45.132.245.30 "cd /root/bioregional-commons-web/web && npm ci && npm run build"
ssh root@45.132.245.30 "systemctl restart commons-web"

# Verify
ssh root@45.132.245.30 "systemctl status commons-web --no-pager"
```

## Environment Variables

Commons admin endpoints require per-node bearer tokens:
- `KOI_OCTO_COMMONS_TOKEN` — Token for Octo commons endpoints
- `KOI_FR_COMMONS_TOKEN` — Token for FR commons endpoints
- `KOI_GV_COMMONS_TOKEN` — Token for GV commons endpoints
- `KOI_CV_COMMONS_TOKEN` — Token for CV commons endpoints

Currently not set (localhost access passes without auth).
