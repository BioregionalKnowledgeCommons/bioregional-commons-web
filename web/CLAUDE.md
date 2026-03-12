# CLAUDE.md — bioregional-commons-web/web

## Auth Architecture

### Files
- `src/lib/auth/config.server.ts` — RP + JWT config from env vars
- `src/lib/auth/db.server.ts` — `pg.Pool` for `bkc_auth` database
- `src/lib/auth/session.server.ts` — JWT create/get/destroy, challenge store/consume
- `src/lib/auth/require-session.server.ts` — `requireSession()` + `requireSteward(nodeId)` guards
- `src/lib/auth/verify-session-edge.ts` — Lightweight JWT verify for edge middleware (no DB)
- `src/lib/auth/client.ts` — Client-side register/login/logout/fetchSession using `@simplewebauthn/browser`
- `src/middleware.ts` — Edge middleware protecting `/commons/api/*` routes
- `src/types/auth.ts` — `AuthUser`, `SessionPayload` types
- `src/components/auth/AuthDialog.tsx` — Registration + login dialog with WebAuthn
- `src/components/auth/AuthProvider.tsx` — React context providing `useAuth()` hook
- `src/components/auth/UserMenu.tsx` — Header user avatar / sign-in button
- `src/app/api/auth/` — 6 auth API routes (register options/verify, login options/verify, session GET/DELETE)
- `migrations/001_auth_tables.sql` — Schema: users, credentials, challenges, sessions, commons_memberships

### Key Patterns
- **Transactional registration**: User + credential INSERT wrapped in a DB transaction. If credential fails, user row rolls back (no orphans).
- **Challenge type enforcement**: `consumeChallenge("registration")` won't accept an `"authentication"` challenge and vice versa. Prevents challenge replay across flows.
- **Dual-layer JWT validation**: Edge middleware does fast signature-only check (no DB). Route handlers call `requireSteward()` which does full DB session lookup (revocation, expiry) + role check.
- **Cookie scoping**: `bkc_session` cookie scoped to `path: "/commons"` so it's only sent on commons routes.
- **One-tap passkey sign-in**: Sign In tab defaults to passkey-only (no username field). Uses discoverable credentials so browser passkey picker identifies the user. "Use username instead" fallback reveals username input pre-filled from `localStorage` key `bkc-last-username`. Username saved after each successful login (try/caught for private browsing resilience).

### Deploying to Production

The web app runs on the Octo server (`45.132.245.30`) as a systemd service:

```bash
# 1. Push to origin/main
# 2. SSH to server and pull + rebuild
ssh root@45.132.245.30
cd /root/bioregional-commons-web
git fetch origin main && git checkout -B main origin/main
cd web && npm ci && npm run build

# 3. Restart the service
systemctl restart commons-web
systemctl status commons-web  # verify active (running)

# 4. Health check
curl -s -o /dev/null -w "%{http_code}" https://45.132.245.30.sslip.io/commons/
```

Service: `commons-web.service` (`/etc/systemd/system/commons-web.service`). Runs `npm start` in `/root/bioregional-commons-web/web`.

## Flow Funding Visualization

TBFF (Threshold-Based Flow Funding) interactive visualization at `/commons/flow-funding`. Vendored from [Jeff-Emmett/flow-funding](https://github.com/Jeff-Emmett/flow-funding) (forked to `BioregionalKnowledgeCommons/flow-funding`), using `@xyflow/react` v12.

### Files
- `src/app/flow-funding/page.tsx` — Route with dynamic imports (`ssr: false` for canvas)
- `src/components/flow-funding/FlowCanvas.tsx` — Vendored canvas with static demo data (Victoria Landscape Hub)
- `src/components/flow-funding/FlowFundingPage.tsx` — Client wrapper: Demo/Live mode toggle, settlement→node transform
- `src/components/flow-funding/types.ts` — Vendored types + BKC extensions (ClaimState, SettlementSnapshot)
- `src/components/flow-funding/flow-funding.css` — Scoped React Flow dark theme overrides
- `src/components/flow-funding/nodes/FunnelNode.tsx` — Funnel node with SVG fill + dark theme
- `src/components/flow-funding/nodes/OutcomeNode.tsx` — Outcome node with claim state badge
- `src/app/api/flow-funding/settlements/route.ts` — BFF proxy to `GET /claims/settlements`
- `src/app/api/flow-funding/participants/route.ts` — BFF proxy to `GET /entities?entity_type=Organization`
- `src/hooks/useSettlements.ts` — React Query hook (60s refetch)
- `src/hooks/useParticipants.ts` — React Query hook for participant entities

### Modes
- **Demo**: Static data from Victoria Landscape Hub (Hub Cultivator → 3 funnels → Mycopunks outcome)
- **Live**: Real settlement data from KOI `GET /claims/settlements` endpoint (requires `node_balances` in receipt metadata)

### Key Patterns
- **Vendoring**: 5 files extracted from flow-funding repo with attribution comment headers. Modified data layer; original simulation logic preserved.
- **Threshold bands**: auto (<$500 USD), semi ($500-$5k), manual (>$5k). Derived from `total_redistributed_usd`.
- **Claim state display**: Color-coded badges on OutcomeNode (yellow=self_reported, blue=peer_reviewed, emerald=verified, purple=ledger_anchored).
- **Dark theme**: All components adapted for `bg-gray-950` (bg-gray-800 cards, gray-700 borders, explicit SVG fills).

<claude-mem-context>
# Recent Activity

<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->

### Mar 11, 2026

| ID | Time | T | Title | Read |
|----|------|---|-------|------|
| #15718 | 7:30 PM | 🔵 | Bioregional Commons Web Frontend Has Standard Next.js Structure | ~409 |
</claude-mem-context>