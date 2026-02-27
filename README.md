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

## Authentication & Authorization

WebAuthn passkey-based auth — no passwords. Users register/login with device biometrics or security keys.

### Auth Flow
1. User clicks "Sign In" → `AuthDialog` opens (register or login tab)
2. Client requests challenge from server (`/api/auth/register/options` or `/api/auth/login/options`)
3. Browser WebAuthn API prompts for biometric/security key
4. Client sends signed credential to server (`/api/auth/register/verify` or `/api/auth/login/verify`)
5. Server verifies, creates JWT session, sets `bkc_session` httpOnly cookie

### Auth API Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/register/options` | POST | Generate WebAuthn registration challenge |
| `/api/auth/register/verify` | POST | Verify registration + create user (transactional) |
| `/api/auth/login/options` | POST | Generate WebAuthn authentication challenge |
| `/api/auth/login/verify` | POST | Verify login + issue session |
| `/api/auth/session` | GET | Check current session |
| `/api/auth/session` | DELETE | Logout (revoke session) |

### Steward Authorization
Commons governance actions (approve/reject shares, resolve merges) require **steward** role on the target node. Authorization is checked per-node via the `commons_memberships` table:
- `POST /api/nodes/[nodeId]/commons/decide` — requires steward on `nodeId`
- `POST /api/nodes/[nodeId]/commons/resolve-merges/[shareId]` — requires steward on `nodeId`
- Users with global `admin` role bypass per-node checks

### Database
Auth uses a separate `bkc_auth` PostgreSQL database (not the KOI knowledge graphs). Tables: `users`, `credentials`, `challenges`, `sessions`, `commons_memberships`.

```bash
createdb bkc_auth
psql bkc_auth < web/migrations/001_auth_tables.sql
```

### Dual-Layer JWT Validation
1. **Edge middleware** (`middleware.ts`): Fast JWT signature check on all `/commons/api/*` requests. Rejects expired/invalid tokens before hitting route handlers.
2. **Route handlers** (`require-session.server.ts`): Full DB session check (not revoked, not expired) + steward role verification against `commons_memberships`.

## Environment Variables

### KOI Node Tokens
Commons admin endpoints require per-node bearer tokens:
- `KOI_OCTO_COMMONS_TOKEN` — Token for Octo commons endpoints
- `KOI_FR_COMMONS_TOKEN` — Token for FR commons endpoints
- `KOI_GV_COMMONS_TOKEN` — Token for GV commons endpoints
- `KOI_CV_COMMONS_TOKEN` — Token for CV commons endpoints

Currently not set (localhost access passes without auth).

### Auth
- `AUTH_JWT_SECRET` — HMAC secret for signing JWTs (required)
- `AUTH_JWT_ISSUER` — JWT issuer claim (default: `bkc-commons`)
- `AUTH_RP_ID` — WebAuthn Relying Party ID (default: `localhost`, production: `45.132.245.30.sslip.io`)
- `AUTH_RP_NAME` — WebAuthn RP display name (default: `Bioregional Knowledge Commons`)
- `AUTH_RP_ORIGIN` — WebAuthn expected origin (default: `http://localhost:3000`)
- `AUTH_DATABASE_URL` — PostgreSQL connection string for `bkc_auth` database
