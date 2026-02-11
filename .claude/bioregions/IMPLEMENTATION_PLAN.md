# Bioregional Knowledge Commons Visualizer

**Comprehensive Implementation Plan**

OpenCivics Labs · Version 1.1 · February 2026

---

## Development Progress Tracker

> **Last Updated:** 2026-02-10
> **Current Phase:** Phase 1 (Globe & Registry) — COMPLETION SPRINT
> **Previous:** Phase 0 (Foundation) + Phase 1 core — completed 2026-02-10

### Sprint 1 Completed (2026-02-10) — Foundation + Core Prototype

| Task ID | Description | Status | Date |
|---------|-------------|--------|------|
| `P0-T1.2` | Initialize monorepo (Next.js + TypeScript + Tailwind) | ✅ DONE | 2026-02-10 |
| `P0-T1.3` | Create package scaffolds (`@opencivics/web`) | ✅ DONE | 2026-02-10 |
| `P0-T1.4` | Configure TypeScript with path aliases and strict mode | ✅ DONE | 2026-02-10 |
| `P0-T2.5` | Create initial `registry.json` with seed nodes | ✅ DONE (as TS module) | 2026-02-10 |
| `P0-T2.7` | Add `bioregion-lookup.json` from One Earth data | ✅ DONE (as TS module) | 2026-02-10 |
| `P0-T2.8` | Add `realm-colors.json` palette | ✅ DONE (in types) | 2026-02-10 |
| `P1-T1.6` | Extract bioregion centroids for node placement | ✅ DONE | 2026-02-10 |
| `P1-T1.7` | Generate realm color assignments | ✅ DONE | 2026-02-10 |
| `P1-T2.1` | Set up Three.js scene with React Three Fiber | ✅ DONE | 2026-02-10 |
| `P1-T2.2` | Implement globe sphere geometry with texture | ✅ DONE | 2026-02-10 |
| `P1-T2.3` | Implement camera controls (orbit, zoom, pan) | ✅ DONE | 2026-02-10 |
| `P1-T2.4` | Add auto-rotation with pause on interaction | ✅ DONE | 2026-02-10 |
| `P1-T2.5` | Implement responsive canvas sizing | ✅ DONE | 2026-02-10 |
| `P1-T3.2` | Create custom shader for choropleth coloring | ✅ DONE (simplified) | 2026-02-10 |
| `P1-T3.3` | Implement realm-based color assignment | ✅ DONE | 2026-02-10 |
| `P1-T3.4` | Add bioregion hover interaction | ✅ DONE | 2026-02-10 |
| `P1-T3.5` | Create hover tooltip component | ✅ DONE | 2026-02-10 |
| `P1-T3.7` | Add boundary toggle control | ✅ DONE | 2026-02-10 |
| `P1-T4.1` | Create instanced mesh for node markers | ✅ DONE | 2026-02-10 |
| `P1-T4.2` | Position markers at bioregion centroids | ✅ DONE | 2026-02-10 |
| `P1-T4.3` | Implement marker sizing by vault size | ✅ DONE | 2026-02-10 |
| `P1-T4.4` | Implement marker coloring by thematic domain | ✅ DONE | 2026-02-10 |
| `P1-T4.5` | Add pulse animation for agent status | ✅ DONE | 2026-02-10 |
| `P1-T4.7` | Implement click detection with raycasting | ✅ DONE | 2026-02-10 |
| `P1-T4.8` | Connect to Node Card opening | ✅ DONE | 2026-02-10 |
| `P1-T5.1` | Create arc geometry from source to target | ✅ DONE | 2026-02-10 |
| `P1-T5.2` | Implement great-circle arc calculation | ✅ DONE | 2026-02-10 |
| `P1-T5.3` | Create particle animation shader | ✅ DONE | 2026-02-10 |
| `P1-T5.4` | Implement arc thickness by volume | ✅ DONE | 2026-02-10 |
| `P1-T5.5` | Implement arc opacity by recency | ✅ DONE | 2026-02-10 |
| `P1-T6.1` | Create "Find My Bioregion" prompt component | ✅ DONE | 2026-02-10 |
| `P1-T6.2` | Implement browser geolocation API integration | ✅ DONE | 2026-02-10 |
| `P1-T6.3` | Create client-side point-in-polygon lookup | ✅ DONE (nearest centroid) | 2026-02-10 |
| `P1-T6.7` | Handle "no nodes in bioregion" prompt | ✅ DONE | 2026-02-10 |
| `P1-T6.8` | Persist location preference (localStorage) | ✅ DONE | 2026-02-10 |
| `P1-T7.1` | Create Node Card container component | ✅ DONE | 2026-02-10 |
| `P1-T7.2` | Implement Identity Block | ✅ DONE | 2026-02-10 |
| `P1-T7.4` | Implement Activity Block | ✅ DONE | 2026-02-10 |
| `P1-T7.5` | Create Participation Block with CTAs | ✅ DONE | 2026-02-10 |
| `P1-T7.6` | Add placeholder for Agent Chat (Phase 2) | ✅ DONE | 2026-02-10 |
| `P1-T7.7` | Implement Fork CTA for power users | ✅ DONE | 2026-02-10 |
| `P1-T7.10` | Add slide-in animation for card opening | ✅ DONE | 2026-02-10 |
| `P1-T7.11` | Implement close button and click-outside | ✅ DONE | 2026-02-10 |
| `P1-T8.1` | Create `/api/registry` endpoint | ✅ DONE | 2026-02-10 |
| `P1-T8.2` | Implement registry caching (5 min ISR) | ✅ DONE | 2026-02-10 |
| `P1-T8.3` | Create `/api/bioregion/:code` endpoint | ✅ DONE | 2026-02-10 |
| `P1-T8.4` | Create `/api/node/:id` endpoint | ✅ DONE | 2026-02-10 |
| `P1-T8.5` | Add error handling and 404 responses | ✅ DONE | 2026-02-10 |
| `P1-T9.1`–`P1-T9.5` | Create 5 seed nodes (data) | ✅ DONE (as TS seed data) | 2026-02-10 |
| `P1-T10.1` | Create landing page layout with globe as hero | ✅ DONE | 2026-02-10 |
| `P1-T10.2` | Implement "Start a Commons" button | ✅ DONE | 2026-02-10 |
| `P1-T10.3` | Create search overlay component | ✅ DONE | 2026-02-10 |
| `P1-T10.4` | Create filter panel component | ✅ DONE | 2026-02-10 |
| `P1-T10.8` | Add loading states and skeleton UI | ✅ DONE | 2026-02-10 |

### Sprint 2 Completed (2026-02-11) — Bioregion Polygons + Interaction

| Task ID | Description | Status | Date |
|---------|-------------|--------|------|
| `P1-T1.1` | Download One Earth enriched GeoJSON (21.4 MB) | ✅ DONE | 2026-02-11 |
| `P1-T1.3` | Simplify GeoJSON to ~400KB for client-side | ✅ DONE | 2026-02-11 |
| `P1-T1.8` | Create simplified boundary JSON for client PIP | ✅ DONE | 2026-02-11 |
| `P1-T1.9` | Write data processing documentation | ✅ DONE (inline) | 2026-02-11 |
| `P1-T3.1` | Render bioregion polygons on globe (Three.js mesh) | ✅ DONE | 2026-02-11 |
| `P1-T3.6` | Optimize bioregion loading and rendering | ✅ DONE | 2026-02-11 |
| `P1-T6.4` | Implement smooth camera animation to bioregion | ✅ DONE | 2026-02-11 |
| `P1-T6.6` | Create bioregion label overlay (BioregionPanel) | ✅ DONE | 2026-02-11 |
| — | Bioregion click → panel with knowledge commons list | ✅ DONE | 2026-02-11 |
| — | BioregionPanel → NodeCard transition on click | ✅ DONE | 2026-02-11 |
| — | Full 185-bioregion detection (useBioregionDetection) | ✅ DONE | 2026-02-11 |
| — | Store-driven camera animation (CameraAnimator) | ✅ DONE | 2026-02-11 |
| — | `flyTo()` Zustand action for any component | ✅ DONE | 2026-02-11 |

### Sprint 3 Completed (2026-02-11) — Phase 1 Completion

| Task ID | Description | Status | Date |
|---------|-------------|--------|------|
| `P1-T10.5` | Implement list view mode (sortable, filterable) | ✅ DONE | 2026-02-11 |
| `P1-T10.3+` | Make search functional (results dropdown, fly-to, keyboard nav) | ✅ DONE | 2026-02-11 |
| `P1-T10.6` | Mobile responsive design (bottom sheets, collapsible controls) | ✅ DONE | 2026-02-11 |
| `P1-T10.7` | Keyboard navigation + accessibility (Escape, ?, ARIA) | ✅ DONE | 2026-02-11 |
| `P1-T4.6` | Node clustering for overlapping markers | ✅ DONE | 2026-02-11 |
| `P1-T5.9` | Flow arc hover + tooltip | ✅ DONE | 2026-02-11 |
| `P1-T5.10` | Flow tooltip component (FlowTooltip.tsx) | ✅ DONE | 2026-02-11 |
| `P1-T6.5` | Bioregion highlight glow on selection | ✅ DONE | 2026-02-11 |
| `P1-T11.1` | Code splitting / lazy load optimization | ✅ DONE | 2026-02-11 |
| `P1-T11.2` | Static asset caching headers (next.config.ts) | ✅ DONE | 2026-02-11 |
| `P1-T7.8` | Shareable node URLs with proper OG meta | ✅ DONE | 2026-02-11 |
| `P1-T7.9` | Open Graph meta tags for all routes | ✅ DONE | 2026-02-11 |
| — | Bioregion deep-link route (`/bioregion/[code]`) | ✅ DONE | 2026-02-11 |
| — | Constants module (`src/lib/constants.ts`) | ✅ DONE | 2026-02-11 |
| — | Keyboard shortcuts overlay (`?` key) | ✅ DONE | 2026-02-11 |
| — | `useKeyboardNav` hook (global Escape handling) | ✅ DONE | 2026-02-11 |

### Sprint 4 Completed (2026-02-10) — Ecoregions, Legend, Camera Lock

| Task ID | Description | Status | Date |
|---------|-------------|--------|------|
| — | Ecoregion layer on globe (RESOLVE API, WGS84, simplified geometries) | ✅ DONE | 2026-02-10 |
| — | Ecoregion toggle in layers modal (ControlPanel) | ✅ DONE | 2026-02-10 |
| — | BioregionPanel: ecoregion list + drill-down, dynamic API fetch, holonic display | ✅ DONE | 2026-02-10 |
| — | Deterministic ecoregion colors: `getEcoColor(ecoId)` — panel legend matches globe | ✅ DONE | 2026-02-10 |
| — | Click ecoregion on globe → open ecoregion detail in panel | ✅ DONE | 2026-02-10 |
| — | Camera: no auto-rotate when bioregion or ecoregion selected; zoom in (minDistance 1.2) | ✅ DONE | 2026-02-10 |
| — | EcoregionLayer: GPU geometry dispose on change; API simplification + client simplifyRing | ✅ DONE | 2026-02-10 |

### Remaining (Deferred)

| Task ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| `P0-T1.1` | Create GitHub organization | ⏳ DEFERRED | Using local dev |
| `P0-T1.5` | Set up ESLint + Prettier | ✅ PARTIAL | ESLint via create-next-app |
| `P0-T2.2` | Define `node-schema.json` | ⏳ DEFERRED | Schema in TypeScript |
| `P0-T3` | CI/CD Pipeline Setup | ⏳ DEFERRED | No GitHub Actions yet |
| `P0-T4` | Template Repository Creation | ⏳ DEFERRED | |
| `P1-T1.2` | Tippecanoe tile generation | ❌ SKIPPED | Using direct Three.js mesh rendering |
| `P1-T1.4` | Generate vector tiles (.mbtiles) | ❌ SKIPPED | Not needed — direct polygon rendering |
| `P1-T1.5` | Convert to PMTiles | ❌ SKIPPED | Not needed |
| `P1-T2.6` | WebGL capability detection/fallback | ⏳ DEFERRED | |
| `P1-T5.7` | Real GitHub API flow data fetching | ⏳ DEFERRED | Using seed data |
| `P1-T7.3` | Mini-map in Node Card | ⏳ DEFERRED | |
| `P1-T8.6`–`P1-T8.7` | API docs + tests | ⏳ DEFERRED | |
| **Phase 2** | Agents & Onboarding (P2-T1 → P2-T11) | ⏳ NEXT PHASE | |
| **Phase 3** | Federation & Bridges (P3-T1 → P3-T9) | ⏳ FUTURE | |
| **Phase 4** | Scale & Self-Serve (P4-T1 → P4-T6) | ⏳ FUTURE | |

---

## Document Purpose

This implementation plan provides granular task decomposition for coordinated agent-based development. Each task includes:

- **Dependencies** — What must complete before this task can start
- **Outputs** — Concrete deliverables that mark completion
- **Architecture Reference** — Cross-reference to TECHNICAL_ARCHITECTURE.md
- **Parallelization Notes** — What can run concurrently
- **Agent Coordination Tags** — Task classification for swarm assignment

---

## Task Classification Schema

```yaml
Task Types:
  INFRA     # Infrastructure, deployment, CI/CD
  DATA      # Data processing, schemas, migrations
  FRONTEND  # UI components, styling, interactions
  BACKEND   # API routes, server logic
  AGENT     # AI agent development, prompts, tools
  BRIDGE    # Federation, schema bridges
  DOCS      # Documentation, templates, guides
  TEST      # Testing, validation, QA

Complexity:
  S   # Small: 1-4 hours
  M   # Medium: 4-16 hours
  L   # Large: 16-40 hours
  XL  # Extra Large: 40+ hours

Parallelization:
  INDEPENDENT    # No dependencies within phase
  SEQUENTIAL     # Must follow prior task
  PARALLEL-SAFE  # Can run with other PARALLEL-SAFE tasks
  BLOCKING       # Blocks other tasks until complete
```

---

## Phase Overview

| Phase | Name | Duration | Primary Focus |
|-------|------|----------|---------------|
| **0** | Foundation | Week 1-2 | Repository setup, tooling, CI/CD |
| **1** | Globe & Registry | Week 3-8 | Visualization, registry, seed nodes |
| **2** | Agents & Onboarding | Week 9-14 | Agent runtime, creation engine |
| **3** | Federation & Bridges | Week 15-20 | Federation protocol, schema bridges |
| **4** | Scale & Self-Serve | Week 21+ | Portal, automation, observability |

---

## Phase 0: Foundation

**Objective:** Establish development infrastructure, repositories, CI/CD pipelines, and development environment.

**Phase Dependencies:** None (project start)

**Phase Outputs:**
- Monorepo with all package scaffolds
- CI/CD pipelines operational
- Development environment documented
- Template repository created

---

### Task 0.1: Repository Initialization

| Field | Value |
|-------|-------|
| **ID** | `P0-T1` |
| **Type** | INFRA |
| **Complexity** | M |
| **Dependencies** | None |
| **Parallelization** | BLOCKING |
| **Architecture Ref** | §10 Technology Stack |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P0-T1.1` | Create GitHub organization `opencivics-commons` | Org created with team structure | 1h |
| `P0-T1.2` | Initialize monorepo with Turborepo/pnpm workspaces | `package.json`, `turbo.json`, `pnpm-workspace.yaml` | 2h |
| `P0-T1.3` | Create package scaffolds: `@opencivics/web`, `@opencivics/agent-runtime`, `@opencivics/commons-cli`, `@opencivics/shared` | Empty packages with `package.json` | 2h |
| `P0-T1.4` | Configure TypeScript with path aliases and strict mode | `tsconfig.json` base + per-package configs | 2h |
| `P0-T1.5` | Set up ESLint + Prettier with shared config | `.eslintrc.js`, `.prettierrc`, pre-commit hooks | 1h |
| `P0-T1.6` | Create `.env.example` files for each package | Environment variable documentation | 1h |
| `P0-T1.7` | Write `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` | Contributor documentation | 1h |

---

### Task 0.2: Index Registry Repository

| Field | Value |
|-------|-------|
| **ID** | `P0-T2` |
| **Type** | DATA + INFRA |
| **Complexity** | M |
| **Dependencies** | `P0-T1.1` |
| **Parallelization** | PARALLEL-SAFE |
| **Architecture Ref** | §3.7 Module 7, §4.1 Registry Schema |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P0-T2.1` | Create `index-registry` repository | Empty repo with README | 0.5h |
| `P0-T2.2` | Define `node-schema.json` (JSON Schema) | Schema file matching §4.1 | 3h |
| `P0-T2.3` | Define `bridge-schema.json` (JSON Schema) | Schema file matching PRD Appendix A | 2h |
| `P0-T2.4` | Define `federation-schema.json` (JSON Schema) | Schema for federation protocol | 2h |
| `P0-T2.5` | Create initial `registry.json` with empty nodes array | Valid empty registry | 0.5h |
| `P0-T2.6` | Create `bridges/` directory with `.gitkeep` | Directory structure | 0.25h |
| `P0-T2.7` | Add `bioregion-lookup.json` from One Earth data | Lookup table (48KB) | 2h |
| `P0-T2.8` | Add `realm-colors.json` palette | Color mapping for 8 realms | 1h |
| `P0-T2.9` | Write registry `README.md` with contribution guide | Documentation | 2h |

---

### Task 0.3: CI/CD Pipeline Setup

| Field | Value |
|-------|-------|
| **ID** | `P0-T3` |
| **Type** | INFRA |
| **Complexity** | L |
| **Dependencies** | `P0-T1`, `P0-T2` |
| **Parallelization** | SEQUENTIAL |
| **Architecture Ref** | §3.7.2 CI Validation, §6.1 Deployment |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P0-T3.1` | Create `validate-node.yaml` GitHub Action | Validates registry.json on PR | 3h |
| `P0-T3.2` | Create `validate-bridge.yaml` GitHub Action | Validates bridge YAML on PR | 2h |
| `P0-T3.3` | Write `validate-bioregions.js` script | Validates bioregion codes against lookup | 2h |
| `P0-T3.4` | Write `check-duplicates.js` script | Ensures unique node_id values | 1h |
| `P0-T3.5` | Write `validate-urls.js` script | URL format validation | 1h |
| `P0-T3.6` | Write `health-check.js` script | HTTP health check for agent endpoints | 2h |
| `P0-T3.7` | Create `notify-rebuild.yaml` workflow | Triggers Vercel rebuild on registry change | 1h |
| `P0-T3.8` | Set up Vercel project for web package | Vercel configuration, environment variables | 2h |
| `P0-T3.9` | Create `deploy-preview.yaml` for PRs | Preview deployments on PR | 2h |
| `P0-T3.10` | Set up Codecov for test coverage | Coverage reporting | 1h |

---

### Task 0.4: Template Repository Creation

| Field | Value |
|-------|-------|
| **ID** | `P0-T4` |
| **Type** | DATA + DOCS |
| **Complexity** | M |
| **Dependencies** | `P0-T2.2`, `P0-T2.3` |
| **Parallelization** | PARALLEL-SAFE |
| **Architecture Ref** | §6.3 Configuration Agent, PRD Appendix B |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P0-T4.1` | Create `commons-template` repository | Template repo with Obsidian vault structure | 1h |
| `P0-T4.2` | Create blank `schema.yaml` with commented examples | Schema template (PRD Appendix B format) | 2h |
| `P0-T4.3` | Create blank `agent.config.yaml` template | Agent configuration template | 2h |
| `P0-T4.4` | Create initial vault structure: `/governance`, `/ecology`, `/practice`, `/community` | Directory structure with README per folder | 2h |
| `P0-T4.5` | Add Quartz configuration (`quartz.config.ts`) | Default Quartz setup | 2h |
| `P0-T4.6` | Create `.github/workflows/deploy-quartz.yaml` | Auto-deploy to GitHub Pages | 2h |
| `P0-T4.7` | Write template `README.md` with setup instructions | User-facing documentation | 2h |
| `P0-T4.8` | Create `GETTING_STARTED.md` guide | Step-by-step setup for new creators | 3h |

---

### Task 0.5: Development Environment Documentation

| Field | Value |
|-------|-------|
| **ID** | `P0-T5` |
| **Type** | DOCS |
| **Complexity** | S |
| **Dependencies** | `P0-T1`, `P0-T3` |
| **Parallelization** | PARALLEL-SAFE |
| **Architecture Ref** | §10.4 Infrastructure as Code |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P0-T5.1` | Create `docker-compose.yml` for local development | Local stack: PostgreSQL, Redis | 2h |
| `P0-T5.2` | Write `docs/DEVELOPMENT.md` setup guide | Developer onboarding docs | 2h |
| `P0-T5.3` | Create VS Code workspace settings | `.vscode/settings.json`, recommended extensions | 1h |
| `P0-T5.4` | Write `docs/ARCHITECTURE.md` overview | Architecture summary for developers | 2h |

---

## Phase 1: Globe & Registry

**Objective:** Deliver the interactive globe visualization with bioregion choropleth, node markers, flow arcs, and static Node Cards. Establish seed nodes.

**Phase Dependencies:** Phase 0 complete

**Phase Outputs:**
- Globe rendering on landing page
- Location sharing and bioregion zoom
- Node Cards with static content (no agent chat yet)
- 3-5 seed nodes in registry
- Flow arc visualization from git data

---

### Task 1.1: Bioregion Data Processing

| Field | Value |
|-------|-------|
| **ID** | `P1-T1` |
| **Type** | DATA |
| **Complexity** | L |
| **Dependencies** | `P0-T2.7` |
| **Parallelization** | INDEPENDENT |
| **Architecture Ref** | §3.1.2 Bioregion Data Pipeline |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P1-T1.1` | Download One Earth enriched GeoJSON (21.4 MB) | Raw source file | 0.5h |
| `P1-T1.2` | Write Tippecanoe processing script | Shell script for tile generation | 2h |
| `P1-T1.3` | Simplify GeoJSON to 2-3 MB for client-side | Simplified GeoJSON | 2h |
| `P1-T1.4` | Generate vector tiles (`.mbtiles`) | Mapbox Vector Tiles output | 2h |
| `P1-T1.5` | Convert to PMTiles for static hosting | Single PMTiles file | 1h |
| `P1-T1.6` | Extract bioregion centroids for node placement | Centroid JSON file | 2h |
| `P1-T1.7` | Generate realm color assignments | Color mapping validated | 1h |
| `P1-T1.8` | Create simplified boundary JSON for client PIP | Lightweight lookup (~500KB) | 3h |
| `P1-T1.9` | Write data processing documentation | Processing pipeline docs | 1h |

---

### Task 1.2: Globe Core Implementation

| Field | Value |
|-------|-------|
| **ID** | `P1-T2` |
| **Type** | FRONTEND |
| **Complexity** | XL |
| **Dependencies** | `P0-T1`, `P1-T1` |
| **Parallelization** | BLOCKING (for other globe tasks) |
| **Architecture Ref** | §3.1 Module 1: Globe |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P1-T2.1` | Set up Three.js scene with React Three Fiber | `GlobeCore.tsx` component | 4h |
| `P1-T2.2` | Implement globe sphere geometry with earth texture | Textured sphere rendering | 3h |
| `P1-T2.3` | Implement camera controls (orbit, zoom, pan) | Interactive camera | 3h |
| `P1-T2.4` | Add auto-rotation with pause on interaction | Rotation animation | 2h |
| `P1-T2.5` | Implement responsive canvas sizing | Handles window resize | 1h |
| `P1-T2.6` | Add WebGL capability detection and fallback | Graceful degradation | 2h |
| `P1-T2.7` | Performance optimization: frustum culling, LOD | Optimized rendering | 4h |
| `P1-T2.8` | Write unit tests for globe core | Test suite | 3h |

---

### Task 1.3: Bioregion Choropleth Layer

| Field | Value |
|-------|-------|
| **ID** | `P1-T3` |
| **Type** | FRONTEND |
| **Complexity** | L |
| **Dependencies** | `P1-T2.1`, `P1-T1.4` |
| **Parallelization** | PARALLEL-SAFE (with T1.4, T1.5) |
| **Architecture Ref** | §3.1.1 Rendering Engine, §4.2 Bioregion Layer |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P1-T3.1` | Integrate MapLibre GL for vector tile loading | MapLibre setup | 3h |
| `P1-T3.2` | Create custom shader for choropleth coloring | GLSL shader code | 4h |
| `P1-T3.3` | Implement realm-based color assignment | Color by realm | 2h |
| `P1-T3.4` | Add bioregion hover interaction | Highlight on hover | 3h |
| `P1-T3.5` | Create hover tooltip component | Bioregion name, realm, node count | 2h |
| `P1-T3.6` | Optimize tile loading and caching | Performance tuning | 2h |
| `P1-T3.7` | Add boundary toggle control | Show/hide boundaries | 1h |
| `P1-T3.8` | Write integration tests | Test suite | 2h |

---

### Task 1.4: Node Markers Layer

| Field | Value |
|-------|-------|
| **ID** | `P1-T4` |
| **Type** | FRONTEND |
| **Complexity** | M |
| **Dependencies** | `P1-T2.1`, `P0-T2.5` |
| **Parallelization** | PARALLEL-SAFE (with T1.3, T1.5) |
| **Architecture Ref** | §4.4 Node Markers |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P1-T4.1` | Create instanced mesh for node markers | `NodeMarkers.tsx` | 3h |
| `P1-T4.2` | Position markers at bioregion centroids | Lat/lng to 3D position | 2h |
| `P1-T4.3` | Implement marker sizing by vault size | Size encoding | 2h |
| `P1-T4.4` | Implement marker coloring by thematic domain | Color encoding | 2h |
| `P1-T4.5` | Add pulse animation for agent status | Shader animation | 3h |
| `P1-T4.6` | Handle clustering for multiple nodes per bioregion | Offset algorithm | 3h |
| `P1-T4.7` | Implement click detection with raycasting | Click handler | 2h |
| `P1-T4.8` | Connect to Node Card opening | Integration | 1h |

---

### Task 1.5: Flow Arcs Layer

| Field | Value |
|-------|-------|
| **ID** | `P1-T5` |
| **Type** | FRONTEND + BACKEND |
| **Complexity** | L |
| **Dependencies** | `P1-T2.1`, `P0-T2.5` |
| **Parallelization** | PARALLEL-SAFE (with T1.3, T1.4) |
| **Architecture Ref** | §4.5 Flow Arcs, §4.3 Flow Data Schema |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P1-T5.1` | Create arc geometry from source to target | `FlowArcs.tsx` | 4h |
| `P1-T5.2` | Implement great-circle arc calculation | Geodesic path | 2h |
| `P1-T5.3` | Create particle animation shader | UV-based particles | 4h |
| `P1-T5.4` | Implement arc thickness by volume | Width encoding | 2h |
| `P1-T5.5` | Implement arc opacity by recency | Time-based fade | 2h |
| `P1-T5.6` | Create `/api/flows` endpoint | Flow data API | 3h |
| `P1-T5.7` | Implement GitHub API flow data fetching | Fork/PR data collection | 4h |
| `P1-T5.8` | Add flow data caching (1 hour TTL) | Redis cache layer | 2h |
| `P1-T5.9` | Implement arc click for tooltip | Click handler | 2h |
| `P1-T5.10` | Create flow tooltip component | Source, target, counts | 2h |

---

### Task 1.6: Location Sharing & Bioregion Zoom

| Field | Value |
|-------|-------|
| **ID** | `P1-T6` |
| **Type** | FRONTEND |
| **Complexity** | M |
| **Dependencies** | `P1-T3`, `P1-T1.8` |
| **Parallelization** | SEQUENTIAL (after choropleth) |
| **Architecture Ref** | §4.3 Location Sharing |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P1-T6.1` | Create "Find My Bioregion" prompt component | UI component | 2h |
| `P1-T6.2` | Implement browser geolocation API integration | Location permission flow | 2h |
| `P1-T6.3` | Create client-side point-in-polygon lookup | PIP against simplified boundaries | 3h |
| `P1-T6.4` | Implement smooth camera animation to bioregion | GSAP/Tween integration | 3h |
| `P1-T6.5` | Add bioregion highlight effect | Glow/outline shader | 2h |
| `P1-T6.6` | Create bioregion label overlay | Name and code display | 2h |
| `P1-T6.7` | Handle "no nodes in bioregion" prompt | CTA for creation | 1h |
| `P1-T6.8` | Persist location preference (localStorage) | Preference storage | 1h |

---

### Task 1.7: Node Cards (Static Version)

| Field | Value |
|-------|-------|
| **ID** | `P1-T7` |
| **Type** | FRONTEND |
| **Complexity** | L |
| **Dependencies** | `P1-T4.7`, `P0-T2` |
| **Parallelization** | PARALLEL-SAFE |
| **Architecture Ref** | §3.2 Module 2: Node Cards |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P1-T7.1` | Create Node Card container component | `NodeCard.tsx` | 2h |
| `P1-T7.2` | Implement Identity Block | Name, bioregion, description, maintainers | 3h |
| `P1-T7.3` | Create mini-map component for bioregion | Small map with highlight | 3h |
| `P1-T7.4` | Implement Activity Block | Stats from registry/GitHub | 3h |
| `P1-T7.5` | Create Participation Block with CTAs | Read, Contribute, Connect links | 2h |
| `P1-T7.6` | Add placeholder for Agent Chat (Phase 2) | "Chat coming soon" state | 1h |
| `P1-T7.7` | Implement Fork CTA for power users | Fork link with instructions | 1h |
| `P1-T7.8` | Create shareable URL routing (`/node/:id`) | Next.js dynamic route | 2h |
| `P1-T7.9` | Implement Open Graph meta tags | Social sharing preview | 2h |
| `P1-T7.10` | Add slide-in animation for card opening | CSS/Framer Motion | 2h |
| `P1-T7.11` | Implement close button and click-outside | UI behavior | 1h |

---

### Task 1.8: Registry API Layer

| Field | Value |
|-------|-------|
| **ID** | `P1-T8` |
| **Type** | BACKEND |
| **Complexity** | M |
| **Dependencies** | `P0-T2`, `P0-T3` |
| **Parallelization** | INDEPENDENT |
| **Architecture Ref** | §5.1 Globe API |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P1-T8.1` | Create `/api/registry` endpoint | Returns full registry | 2h |
| `P1-T8.2` | Implement registry caching (5 min ISR) | Cache layer | 2h |
| `P1-T8.3` | Create `/api/bioregion/:code` endpoint | Bioregion details + nodes | 2h |
| `P1-T8.4` | Create `/api/node/:id` endpoint | Single node details | 1h |
| `P1-T8.5` | Add error handling and 404 responses | Error boundaries | 1h |
| `P1-T8.6` | Write API documentation | OpenAPI spec | 2h |
| `P1-T8.7` | Write API integration tests | Test suite | 2h |

---

### Task 1.9: Seed Node Creation

| Field | Value |
|-------|-------|
| **ID** | `P1-T9` |
| **Type** | DATA + DOCS |
| **Complexity** | L |
| **Dependencies** | `P0-T4`, `P0-T2`, `P1-T8` |
| **Parallelization** | INDEPENDENT |
| **Architecture Ref** | PRD §14.3 (3-5 seed nodes) |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P1-T9.1` | Create seed node 1: Colorado Plateau Watershed Commons | Full vault + registry entry | 4h |
| `P1-T9.2` | Create seed node 2: Sierra Nevada Water Systems Hub | Full vault + registry entry | 4h |
| `P1-T9.3` | Create seed node 3: Cascadia Bioregion Governance | Full vault + registry entry | 4h |
| `P1-T9.4` | Create seed node 4: Great Lakes Commons Network | Full vault + registry entry | 4h |
| `P1-T9.5` | Create seed node 5: Chesapeake Watershed Alliance | Full vault + registry entry | 4h |
| `P1-T9.6` | Deploy Quartz sites for all seed nodes | Published sites | 3h |
| `P1-T9.7` | Submit registry PRs for all seed nodes | PRs merged | 2h |
| `P1-T9.8` | Document seed node creation process | Playbook for future nodes | 2h |

---

### Task 1.10: Landing Page & Navigation

| Field | Value |
|-------|-------|
| **ID** | `P1-T10` |
| **Type** | FRONTEND |
| **Complexity** | M |
| **Dependencies** | `P1-T2`, `P1-T3`, `P1-T4`, `P1-T5` |
| **Parallelization** | SEQUENTIAL (after globe components) |
| **Architecture Ref** | §4.1 Landing Experience |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P1-T10.1` | Create landing page layout with globe as hero | Page structure | 2h |
| `P1-T10.2` | Implement "Start a Commons" button | CTA placement | 1h |
| `P1-T10.3` | Create search overlay component | Search bar UI | 2h |
| `P1-T10.4` | Create filter panel component | Filter controls | 3h |
| `P1-T10.5` | Implement view mode toggle (globe/map/list) | View switching | 3h |
| `P1-T10.6` | Add responsive design for mobile | Media queries | 3h |
| `P1-T10.7` | Implement keyboard navigation | Accessibility | 2h |
| `P1-T10.8` | Add loading states and skeleton UI | UX polish | 2h |

---

### Task 1.11: Performance Optimization

| Field | Value |
|-------|-------|
| **ID** | `P1-T11` |
| **Type** | FRONTEND + INFRA |
| **Complexity** | M |
| **Dependencies** | `P1-T10` |
| **Parallelization** | SEQUENTIAL (end of Phase 1) |
| **Architecture Ref** | §8 Performance Requirements |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P1-T11.1` | Implement code splitting for globe components | Lazy loading | 2h |
| `P1-T11.2` | Optimize Three.js bundle size | Tree shaking | 2h |
| `P1-T11.3` | Add service worker for offline tile caching | PWA capability | 3h |
| `P1-T11.4` | Implement progressive loading for arcs | Prioritized rendering | 2h |
| `P1-T11.5` | Set up Lighthouse CI | Performance monitoring | 2h |
| `P1-T11.6` | Achieve < 3s load time target | Performance validation | 4h |
| `P1-T11.7` | Document performance baselines | Metrics documentation | 1h |

---

## Phase 2: Agents & Onboarding (OpenClaw + Coolify)

**Objective:** Deploy OpenClaw-based agent infrastructure via Coolify, implement bioregional skill pack, enable embedded agent chat, and establish manual onboarding process.

**Phase Dependencies:** Phase 1 complete

**Phase Outputs:**
- Coolify server operational with shared PostgreSQL+pgvector
- Bioregional skill pack developed and tested
- Configuration agent (OpenClaw meta-agent) operational
- Embedded chat in Node Cards
- Manual onboarding flow documented and tested
- First 5-10 external community nodes onboarded

**Architecture Change:** This phase implements the OpenClaw + Coolify approach from AGENT_AS_A_SERVICE.md, replacing custom agent runtime with proven open-source infrastructure. Estimated time reduction: ~60%.

---

### Task 2.1: Coolify Infrastructure Setup

| Field | Value |
|-------|-------|
| **ID** | `P2-T1` |
| **Type** | INFRA |
| **Complexity** | S |
| **Dependencies** | Phase 1 complete |
| **Parallelization** | BLOCKING |
| **Architecture Ref** | §6.1 Shared Server (Coolify) |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P2-T1.1` | Provision Hetzner/OVH server (CX42 or equivalent) | Server running | 1h |
| `P2-T1.2` | Install Coolify on server | Coolify dashboard accessible | 2h |
| `P2-T1.3` | Deploy PostgreSQL with pgvector extension | Database operational | 2h |
| `P2-T1.4` | Create vault_embeddings table (§6.3) | Table created | 1h |
| `P2-T1.5` | Configure Traefik for auto-SSL and routing | SSL working | 2h |
| `P2-T1.6` | Set up backup strategy for PostgreSQL | Backup automation | 2h |
| `P2-T1.7` | Create infrastructure documentation | Ops runbook | 2h |

**Total: ~12h** (vs ~37h in previous architecture)

---

### Task 2.2: Bioregional Skill Pack — vault-rag

| Field | Value |
|-------|-------|
| **ID** | `P2-T2` |
| **Type** | AGENT |
| **Complexity** | L |
| **Dependencies** | `P2-T1.3` |
| **Parallelization** | PARALLEL-SAFE |
| **Architecture Ref** | §3.4.2 Bioregional Skill Pack |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P2-T2.1` | Create `vault-rag` skill directory structure | SKILL.md + files | 1h |
| `P2-T2.2` | Implement markdown chunking algorithm (heading-based) | chunk.ts | 3h |
| `P2-T2.3` | Integrate embedding API (OpenAI or local) | embed.ts | 2h |
| `P2-T2.4` | Implement pgvector upsert logic | Vector storage | 3h |
| `P2-T2.5` | Create `search_vault(query, limit)` tool | search.ts | 3h |
| `P2-T2.6` | Implement GitHub webhook for reindexing on push | index.ts | 3h |
| `P2-T2.7` | Create `vault_stats()` tool | Stats reporting | 1h |
| `P2-T2.8` | Write skill tests | Test suite | 2h |

**Total: ~18h**

---

### Task 2.3: Bioregional Skill Pack — github-steward

| Field | Value |
|-------|-------|
| **ID** | `P2-T3` |
| **Type** | AGENT |
| **Complexity** | M |
| **Dependencies** | None (uses OpenClaw's built-in gh CLI) |
| **Parallelization** | PARALLEL-SAFE |
| **Architecture Ref** | §3.4.2 Bioregional Skill Pack |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P2-T3.1` | Create `github-steward` skill directory structure | SKILL.md + files | 1h |
| `P2-T3.2` | Implement `commit_to_vault(path, content, message)` tool | commit.ts | 2h |
| `P2-T3.3` | Implement `create_pr(title, description, changes)` tool | pull-request.ts | 3h |
| `P2-T3.4` | Implement progressive autonomy phase detection | autonomy.ts | 3h |
| `P2-T3.5` | Create digest generation (daily/weekly summary) | digest.ts | 3h |
| `P2-T3.6` | Write skill tests | Test suite | 2h |

**Total: ~14h**

---

### Task 2.4: Bioregional Skill Pack — librarian

| Field | Value |
|-------|-------|
| **ID** | `P2-T4` |
| **Type** | AGENT |
| **Complexity** | M |
| **Dependencies** | `P2-T2`, `P2-T3` |
| **Parallelization** | PARALLEL-SAFE |
| **Architecture Ref** | §3.4.2 Bioregional Skill Pack |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P2-T4.1` | Create `librarian` skill directory structure | SKILL.md + files | 1h |
| `P2-T4.2` | Implement `ingest_content(topic, content)` tool | ingest.ts | 3h |
| `P2-T4.3` | Implement `categorize_page(content)` auto-categorization | categorize.ts | 2h |
| `P2-T4.4` | Implement `suggest_topics()` from query patterns | suggest.ts | 2h |
| `P2-T4.5` | Write skill tests | Test suite | 2h |

**Total: ~10h**

---

### Task 2.5: Configuration Agent (Meta-Agent)

| Field | Value |
|-------|-------|
| **ID** | `P2-T5` |
| **Type** | AGENT + INFRA |
| **Complexity** | L |
| **Dependencies** | `P2-T1`, `P2-T2`, `P2-T3`, `P2-T4` |
| **Parallelization** | SEQUENTIAL |
| **Architecture Ref** | §6.3 Configuration Agent |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P2-T5.1` | Create Config Agent SOUL.md | Persona file | 2h |
| `P2-T5.2` | Create `coolify-deploy` skill for container deployment | skill directory | 4h |
| `P2-T5.3` | Create `repo-scaffold` skill for template forking | skill directory | 3h |
| `P2-T5.4` | Create `registry-pr` skill for index registry PRs | skill directory | 2h |
| `P2-T5.5` | Deploy Config Agent as OpenClaw instance in Coolify | Running container | 2h |
| `P2-T5.6` | Test end-to-end onboarding flow | Validated flow | 4h |
| `P2-T5.7` | Write onboarding playbook | Documentation | 3h |

**Total: ~20h**

---

### Task 2.6: First Node Agent Deployment

| Field | Value |
|-------|-------|
| **ID** | `P2-T6` |
| **Type** | INFRA + TEST |
| **Complexity** | M |
| **Dependencies** | `P2-T5` |
| **Parallelization** | SEQUENTIAL |
| **Architecture Ref** | §6.2 Container Orchestration |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P2-T6.1` | Deploy first node agent via Config Agent | OpenClaw container running | 2h |
| `P2-T6.2` | Verify all skills functional (vault-rag, github-steward, librarian) | Skills tested | 2h |
| `P2-T6.3` | Verify health endpoint and Coolify monitoring | Health checks passing | 1h |
| `P2-T6.4` | Test multi-channel access (web chat, Telegram) | Channels working | 2h |
| `P2-T6.5` | Document deployment process | Runbook | 2h |

**Total: ~9h**

---

### Task 2.7: Embedded Agent Chat (Frontend)

| Field | Value |
|-------|-------|
| **ID** | `P2-T7` |
| **Type** | FRONTEND |
| **Complexity** | M |
| **Dependencies** | `P2-T6`, `P1-T7` |
| **Parallelization** | PARALLEL-SAFE |
| **Architecture Ref** | §3.2.2 Agent Chat Integration |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P2-T7.1` | Create WebSocket client for OpenClaw agent | WebSocket client | 2h |
| `P2-T7.2` | Implement chat UI component | `AgentChat.tsx` | 3h |
| `P2-T7.3` | Add message rendering with markdown support | Rich text display | 2h |
| `P2-T7.4` | Implement source citation display | Citation cards | 2h |
| `P2-T7.5` | Add typing indicator | Real-time feedback | 1h |
| `P2-T7.6` | Create fallback for offline agents | Graceful degradation | 1h |
| `P2-T7.7` | Integrate chat into Node Card component | Component integration | 1h |

**Total: ~12h** (vs ~26h — OpenClaw handles session persistence, channel multiplexing natively)

---

### Task 2.8: Manual Onboarding Flow

| Field | Value |
|-------|-------|
| **ID** | `P2-T8` |
| **Type** | DOCS + FRONTEND |
| **Complexity** | M |
| **Dependencies** | `P2-T5`, `P2-T6` |
| **Parallelization** | PARALLEL-SAFE |
| **Architecture Ref** | §12.4 Onboarding Maturity Model, PRD Appendix E |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P2-T8.1` | Create intake form (web form) | Form component | 3h |
| `P2-T8.2` | Create onboarding session template (PRD App E) | Checklist document | 2h |
| `P2-T8.3` | Write API key provisioning guide (Anthropic console) | Step-by-step doc | 1h |
| `P2-T8.4` | Create post-onboarding summary template | Email template | 1h |
| `P2-T8.5` | Create friction point logging system | Feedback collection | 1h |
| `P2-T8.6` | Create onboarding tracker (Notion/Airtable) | Tracking system | 2h |

**Total: ~10h**

---

### Task 2.9: External Node Onboarding

| Field | Value |
|-------|-------|
| **ID** | `P2-T9` |
| **Type** | DOCS + DATA |
| **Complexity** | L |
| **Dependencies** | `P2-T8` |
| **Parallelization** | INDEPENDENT |
| **Architecture Ref** | PRD §14.4 Success Criteria |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P2-T9.1` | Identify 10 candidate communities | Outreach list | 4h |
| `P2-T9.2` | Conduct onboarding sessions 1-5 | Nodes 1-5 live | 20h |
| `P2-T9.3` | Conduct onboarding sessions 6-10 | Nodes 6-10 live | 20h |
| `P2-T9.4` | Document all friction points | Friction log | 4h |
| `P2-T9.5` | Iterate playbook based on learnings | Updated playbook | 4h |

**Total: ~52h**

---

### Phase 2 Summary (OpenClaw Architecture)

| Task | Description | Est. Hours |
|------|-------------|------------|
| P2-T1 | Coolify Infrastructure Setup | 12h |
| P2-T2 | Skill Pack: vault-rag | 18h |
| P2-T3 | Skill Pack: github-steward | 14h |
| P2-T4 | Skill Pack: librarian | 10h |
| P2-T5 | Configuration Agent (Meta-Agent) | 20h |
| P2-T6 | First Node Agent Deployment | 9h |
| P2-T7 | Embedded Agent Chat (Frontend) | 12h |
| P2-T8 | Manual Onboarding Flow | 10h |
| P2-T9 | External Node Onboarding | 52h |
| **Total** | | **~157h** |

**Compared to original architecture: ~200+ hours → ~82 hours** (excluding onboarding sessions).
This represents a **~60% reduction in development time** for the agent infrastructure.

---

## Phase 3: Federation & Bridges

**Objective:** Enable agent-to-agent query routing, implement schema bridges for vocabulary translation, deploy CLI tools, and activate global federated search.

**Phase Dependencies:** Phase 2 complete

**Phase Outputs:**
- Federation v1 operational (via `federation` skill)
- Schema bridge format finalized
- 2-3 seed bridges authored
- Bridge-aware query translation (via `bridge-translator` skill)
- CLI tools published
- Global search from globe

---

### Task 3.1: Federation Skill Implementation

| Field | Value |
|-------|-------|
| **ID** | `P3-T1` |
| **Type** | AGENT |
| **Complexity** | L |
| **Dependencies** | Phase 2 complete |
| **Parallelization** | BLOCKING |
| **Architecture Ref** | §3.4.2 Bioregional Skill Pack (federation), §3.5 Federation Layer |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P3-T1.1` | Create `federation` skill directory structure | SKILL.md + files | 1h |
| `P3-T1.2` | Implement `/federation/query` HTTP endpoint in OpenClaw | receive.ts | 3h |
| `P3-T1.3` | Implement `/federation/health` endpoint | health.ts | 1h |
| `P3-T1.4` | Implement `/federation/manifest` endpoint | manifest.ts | 1h |
| `P3-T1.5` | Create `federated_query(query, targets?)` tool | query.ts | 3h |
| `P3-T1.6` | Implement query classification (local vs federated) | classify.ts | 3h |
| `P3-T1.7` | Create peer selection algorithm (§3.5.2) | route.ts | 4h |
| `P3-T1.8` | Implement response synthesis (multi-source merge) | synthesize.ts | 3h |
| `P3-T1.9` | Add federation rate limiting | rate-limit.ts | 2h |
| `P3-T1.10` | Write skill tests | Test suite | 3h |

**Total: ~24h** (vs ~42h — OpenClaw provides HTTP server, logging, metrics natively)

---

### Task 3.2: Schema Bridge Format

| Field | Value |
|-------|-------|
| **ID** | `P3-T2` |
| **Type** | DATA + DOCS |
| **Complexity** | M |
| **Dependencies** | `P0-T2.3` |
| **Parallelization** | INDEPENDENT |
| **Architecture Ref** | §3.6 Module 6: Schema Bridges, PRD Appendix A |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P3-T2.1` | Finalize bridge YAML schema | JSON Schema update | 3h |
| `P3-T2.2` | Create bridge authoring guide | Documentation | 4h |
| `P3-T2.3` | Write vocabulary mapping guide | Mapping guidelines | 3h |
| `P3-T2.4` | Create bridge template file | Template YAML | 2h |
| `P3-T2.5` | Document confidence score semantics | Scoring guide | 2h |
| `P3-T2.6` | Create bridge lifecycle documentation | Lifecycle guide | 2h |

---

### Task 3.3: Bridge-Translator Skill Implementation

| Field | Value |
|-------|-------|
| **ID** | `P3-T3` |
| **Type** | AGENT |
| **Complexity** | M |
| **Dependencies** | `P3-T1`, `P3-T2` |
| **Parallelization** | SEQUENTIAL |
| **Architecture Ref** | §3.4.2 Bioregional Skill Pack (bridge-translator), §3.6.2 Translation Engine |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P3-T3.1` | Create `bridge-translator` skill directory structure | SKILL.md + files | 1h |
| `P3-T3.2` | Create `BridgeTranslator` class | translator.ts | 4h |
| `P3-T3.3` | Implement bridge loading from registry | loader.ts | 2h |
| `P3-T3.4` | Implement `translate_query(query, source, target)` tool | translate.ts | 3h |
| `P3-T3.5` | Handle untranslatable terms (preserve original) | Fallback logic | 1h |
| `P3-T3.6` | Create translation notes for federation responses | notes.ts | 2h |
| `P3-T3.7` | Write skill tests | Test suite | 2h |

**Total: ~15h** (vs ~29h)

---

### Task 3.4: Seed Bridge Creation

| Field | Value |
|-------|-------|
| **ID** | `P3-T4` |
| **Type** | DATA |
| **Complexity** | L |
| **Dependencies** | `P3-T2`, `P1-T9` |
| **Parallelization** | INDEPENDENT |
| **Architecture Ref** | PRD §14.3 (2-3 seed bridges) |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P3-T4.1` | Author bridge: Colorado Plateau ↔ Sierra Nevada | Bridge YAML | 4h |
| `P3-T4.2` | Author bridge: Cascadia ↔ Great Lakes | Bridge YAML | 4h |
| `P3-T4.3` | Author bridge: Sierra Nevada ↔ Cascadia | Bridge YAML | 4h |
| `P3-T4.4` | Submit bridge PRs to registry | PRs merged | 2h |
| `P3-T4.5` | Test bridge translations manually | Validation | 3h |
| `P3-T4.6` | Document bridge creation process | Authoring guide | 2h |

---

### Task 3.5: Bridge Visualization on Globe

| Field | Value |
|-------|-------|
| **ID** | `P3-T5` |
| **Type** | FRONTEND |
| **Complexity** | M |
| **Dependencies** | `P1-T5`, `P3-T4` |
| **Parallelization** | PARALLEL-SAFE |
| **Architecture Ref** | §4.6 Bridge Connections |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P3-T5.1` | Create bridge connection geometry | `BridgeConnections.tsx` | 3h |
| `P3-T5.2` | Implement dashed line styling | Visual distinction | 2h |
| `P3-T5.3` | Add bridge status coloring (green/amber/gray) | Status encoding | 2h |
| `P3-T5.4` | Implement bridge click tooltip | Bridge details | 2h |
| `P3-T5.5` | Add bridge toggle to filter panel | Filter control | 1h |
| `P3-T5.6` | Integrate bridge data from registry | Data loading | 2h |

---

### Task 3.6: CLI Tools Development

| Field | Value |
|-------|-------|
| **ID** | `P3-T6` |
| **Type** | BACKEND |
| **Complexity** | L |
| **Dependencies** | `P0-T4`, `P2-T6` |
| **Parallelization** | INDEPENDENT |
| **Architecture Ref** | §3.3.3 CLI Package Structure, §6.6 CLI |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P3-T6.1` | Create CLI package scaffold | Package structure | 2h |
| `P3-T6.2` | Implement `commons init` command | Interactive scaffold | 4h |
| `P3-T6.3` | Implement `commons register` command | Registry PR | 4h |
| `P3-T6.4` | Implement `commons agent setup` command | Agent configuration | 4h |
| `P3-T6.5` | Implement `commons bridge propose` command | Bridge generation | 4h |
| `P3-T6.6` | Implement `commons bridge validate` command | Bridge validation | 3h |
| `P3-T6.7` | Implement `commons agent test` command | Local testing | 4h |
| `P3-T6.8` | Implement `commons status` command | Health check | 3h |
| `P3-T6.9` | Add colorized output and progress bars | UX polish | 2h |
| `P3-T6.10` | Write CLI documentation | Usage docs | 3h |
| `P3-T6.11` | Publish to npm | npm package | 2h |
| `P3-T6.12` | Write CLI integration tests | Test suite | 4h |

---

### Task 3.7: Global Federated Search

| Field | Value |
|-------|-------|
| **ID** | `P3-T7` |
| **Type** | FRONTEND + BACKEND |
| **Complexity** | L |
| **Dependencies** | `P3-T1`, `P3-T3`, `P1-T10.3` |
| **Parallelization** | SEQUENTIAL |
| **Architecture Ref** | §4.7 Global Search |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P3-T7.1` | Implement `/api/search` endpoint | Search API | 3h |
| `P3-T7.2` | Create search query broadcast to agents | Multi-agent dispatch | 4h |
| `P3-T7.3` | Implement result aggregation | Result merge | 3h |
| `P3-T7.4` | Add responding node highlighting on globe | Visual feedback | 3h |
| `P3-T7.5` | Create search results panel | Results UI | 3h |
| `P3-T7.6` | Link results to Node Cards | Navigation | 2h |
| `P3-T7.7` | Add search filters (bioregion, domain) | Filter UI | 2h |
| `P3-T7.8` | Implement search debouncing | Performance | 1h |
| `P3-T7.9` | Add search analytics | Usage tracking | 2h |

---

### Task 3.8: Federation Cost Controls

| Field | Value |
|-------|-------|
| **ID** | `P3-T8` |
| **Type** | AGENT + BACKEND |
| **Complexity** | M |
| **Dependencies** | `P3-T1` |
| **Parallelization** | PARALLEL-SAFE |
| **Architecture Ref** | §8.3 Cost Implications |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P3-T8.1` | Implement federation policy in agent config | Policy schema | 2h |
| `P3-T8.2` | Create policy enforcement layer | Policy checks | 3h |
| `P3-T8.3` | Implement per-source rate limiting | Rate limiter | 3h |
| `P3-T8.4` | Add federation cost estimation | Cost calculator | 3h |
| `P3-T8.5` | Create federation cost alerts | Alert system | 2h |
| `P3-T8.6` | Document federation cost management | Operator guide | 2h |

---

### Task 3.9: Onboarding Automation (Stage 2)

| Field | Value |
|-------|-------|
| **ID** | `P3-T9` |
| **Type** | AGENT + DOCS |
| **Complexity** | M |
| **Dependencies** | `P2-T10`, `P2-T11` |
| **Parallelization** | PARALLEL-SAFE |
| **Architecture Ref** | §12.4 Stage 2: Semi-Automated |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P3-T9.1` | Analyze friction logs from Phase 2 | Analysis report | 3h |
| `P3-T9.2` | Identify automatable steps | Automation candidates | 2h |
| `P3-T9.3` | Automate GitHub account verification | Auto-check | 2h |
| `P3-T9.4` | Automate bioregion detection from intake | Auto-detect | 2h |
| `P3-T9.5` | Create pre-call preparation automation | Pre-scaffolding | 4h |
| `P3-T9.6` | Reduce onboarding call time to <45 min | Process optimization | 4h |
| `P3-T9.7` | Update playbook to Stage 2 | Documentation update | 2h |

---

## Phase 4: Scale & Self-Serve

**Objective:** Deploy self-serve creation portal, agent observability dashboard, automated bridge suggestions, and prepare for horizontal scaling.

**Phase Dependencies:** Phase 3 complete

**Phase Outputs:**
- Self-serve creation portal
- Agent observability dashboard
- Automated bridge suggestions
- Horizontal scaling capability
- 25+ active nodes

---

### Task 4.1: Self-Serve Creation Portal

| Field | Value |
|-------|-------|
| **ID** | `P4-T1` |
| **Type** | FRONTEND + AGENT |
| **Complexity** | XL |
| **Dependencies** | `P2-T6`, `P3-T9` |
| **Parallelization** | BLOCKING |
| **Architecture Ref** | §6.1-6.3 Creation Engine Self-Serve |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P4-T1.1` | Design portal UI/UX | Wireframes | 4h |
| `P4-T1.2` | Create conversational wizard component | Chat-based wizard | 8h |
| `P4-T1.3` | Integrate configuration agent for self-serve | Agent integration | 6h |
| `P4-T1.4` | Create bioregion selection map interface | Map picker | 4h |
| `P4-T1.5` | Implement GitHub OAuth flow in portal | OAuth integration | 4h |
| `P4-T1.6` | Create API key provisioning wizard | Guided setup | 4h |
| `P4-T1.7` | Implement progress tracking UI | Status display | 3h |
| `P4-T1.8` | Create completion summary page | Summary view | 2h |
| `P4-T1.9` | Add error recovery and retry | Error handling | 4h |
| `P4-T1.10` | Implement portal analytics | Usage tracking | 3h |
| `P4-T1.11` | Write portal documentation | User guide | 3h |
| `P4-T1.12` | Conduct user testing | Testing feedback | 6h |

---

### Task 4.2: Agent Observability Dashboard

| Field | Value |
|-------|-------|
| **ID** | `P4-T2` |
| **Type** | FRONTEND + BACKEND |
| **Complexity** | L |
| **Dependencies** | `P2-T3` |
| **Parallelization** | INDEPENDENT |
| **Architecture Ref** | §7.6 Observability |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P4-T2.1` | Create dashboard page layout | Page structure | 2h |
| `P4-T2.2` | Implement query volume charts | Visualization | 4h |
| `P4-T2.3` | Create API usage tracking display | Cost tracking | 4h |
| `P4-T2.4` | Implement response quality signals | Thumbs up/down | 3h |
| `P4-T2.5` | Create federation traffic view | Traffic graph | 4h |
| `P4-T2.6` | Implement memory growth monitoring | Storage metrics | 3h |
| `P4-T2.7` | Add vector store health indicators | Health status | 2h |
| `P4-T2.8` | Create alert configuration | Alert setup | 3h |
| `P4-T2.9` | Implement dashboard access control | Auth | 3h |

---

### Task 4.3: Automated Bridge Suggestions

| Field | Value |
|-------|-------|
| **ID** | `P4-T3` |
| **Type** | AGENT |
| **Complexity** | L |
| **Dependencies** | `P3-T3`, `P3-T4` |
| **Parallelization** | INDEPENDENT |
| **Architecture Ref** | §9.4 Bridge Discovery |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P4-T3.1` | Create schema similarity analyzer | Similarity algorithm | 6h |
| `P4-T3.2` | Implement vocabulary overlap detection | Overlap scoring | 4h |
| `P4-T3.3` | Create bridge candidate ranking | Ranking algorithm | 4h |
| `P4-T3.4` | Implement draft bridge generation | Auto-generation | 6h |
| `P4-T3.5` | Create bridge suggestion UI in portal | Suggestion display | 3h |
| `P4-T3.6` | Implement suggestion notification to operators | Notification system | 3h |
| `P4-T3.7` | Write bridge suggestion documentation | Feature docs | 2h |

---

### Task 4.4: Horizontal Scaling Preparation

| Field | Value |
|-------|-------|
| **ID** | `P4-T4` |
| **Type** | INFRA |
| **Complexity** | L |
| **Dependencies** | `P2-T1` |
| **Parallelization** | INDEPENDENT |
| **Architecture Ref** | §8.2 Scalability Targets |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P4-T4.1` | Design multi-server architecture | Architecture doc | 4h |
| `P4-T4.2` | Implement agent-to-server assignment | Load balancing | 6h |
| `P4-T4.3` | Create cross-server federation routing | Routing logic | 6h |
| `P4-T4.4` | Implement database read replicas | Replication | 4h |
| `P4-T4.5` | Create regional deployment strategy | Multi-region | 4h |
| `P4-T4.6` | Write scaling runbook | Operations docs | 3h |

---

### Task 4.5: Filter and View Modes

| Field | Value |
|-------|-------|
| **ID** | `P4-T5` |
| **Type** | FRONTEND |
| **Complexity** | M |
| **Dependencies** | `P1-T10.4`, `P1-T10.5` |
| **Parallelization** | INDEPENDENT |
| **Architecture Ref** | §4.8 Filters and Views |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P4-T5.1` | Implement realm filter | Filter control | 2h |
| `P4-T5.2` | Implement thematic domain filter | Filter control | 2h |
| `P4-T5.3` | Implement activity date filter | Filter control | 2h |
| `P4-T5.4` | Implement bridge count filter | Filter control | 2h |
| `P4-T5.5` | Create flat map view (Mercator) | Alternative view | 4h |
| `P4-T5.6` | Create list/table view | Table view | 4h |
| `P4-T5.7` | Implement view state persistence | URL params | 2h |

---

### Task 4.6: Advanced Analytics

| Field | Value |
|-------|-------|
| **ID** | `P4-T6` |
| **Type** | BACKEND + FRONTEND |
| **Complexity** | M |
| **Dependencies** | `P3-T7.9` |
| **Parallelization** | INDEPENDENT |
| **Architecture Ref** | PRD §14.4 Success Criteria |

#### Sub-tasks

| ID | Description | Output | Est. |
|----|-------------|--------|------|
| `P4-T6.1` | Implement network growth metrics | Growth tracking | 3h |
| `P4-T6.2` | Create node health scoring | Health algorithm | 4h |
| `P4-T6.3` | Implement bridge utilization tracking | Usage metrics | 3h |
| `P4-T6.4` | Create public network statistics page | Stats page | 4h |
| `P4-T6.5` | Implement success criteria dashboard | KPI tracking | 4h |

---

## Dependency Graph Summary (OpenClaw Architecture)

```
Phase 0 (Foundation)
├── P0-T1 Repository Init [BLOCKING]
├── P0-T2 Index Registry [depends: P0-T1.1]
├── P0-T3 CI/CD [depends: P0-T1, P0-T2]
├── P0-T4 Template Repo [depends: P0-T2.2, P0-T2.3]
└── P0-T5 Dev Docs [depends: P0-T1, P0-T3]

Phase 1 (Globe & Registry)
├── P1-T1 Bioregion Data [depends: P0-T2.7]
├── P1-T2 Globe Core [depends: P0-T1, P1-T1] [BLOCKING]
├── P1-T3 Choropleth [depends: P1-T2.1, P1-T1.4]
├── P1-T4 Node Markers [depends: P1-T2.1, P0-T2.5]
├── P1-T5 Flow Arcs [depends: P1-T2.1, P0-T2.5]
├── P1-T6 Location [depends: P1-T3, P1-T1.8]
├── P1-T7 Node Cards [depends: P1-T4.7, P0-T2]
├── P1-T8 Registry API [depends: P0-T2, P0-T3]
├── P1-T9 Seed Nodes [depends: P0-T4, P0-T2, P1-T8]
├── P1-T10 Landing Page [depends: P1-T2..T5]
└── P1-T11 Performance [depends: P1-T10]

Phase 2 (Agents & Onboarding — OpenClaw + Coolify)
├── P2-T1 Coolify Infrastructure [depends: Phase 1] [BLOCKING]
├── P2-T2 Skill Pack: vault-rag [depends: P2-T1.3]
├── P2-T3 Skill Pack: github-steward [depends: none — uses OpenClaw gh CLI]
├── P2-T4 Skill Pack: librarian [depends: P2-T2, P2-T3]
├── P2-T5 Config Agent (Meta-Agent) [depends: P2-T1, P2-T2, P2-T3, P2-T4]
├── P2-T6 First Node Agent Deployment [depends: P2-T5]
├── P2-T7 Embedded Chat (Frontend) [depends: P2-T6, P1-T7]
├── P2-T8 Manual Onboarding Flow [depends: P2-T5, P2-T6]
└── P2-T9 External Nodes [depends: P2-T8]

Phase 3 (Federation & Bridges)
├── P3-T1 Federation Skill [depends: Phase 2] [BLOCKING]
├── P3-T2 Bridge Format [depends: P0-T2.3]
├── P3-T3 Bridge-Translator Skill [depends: P3-T1, P3-T2]
├── P3-T4 Seed Bridges [depends: P3-T2, P1-T9]
├── P3-T5 Bridge Visualization [depends: P1-T5, P3-T4]
├── P3-T6 CLI Tools [depends: P0-T4, P2-T5]
├── P3-T7 Global Search [depends: P3-T1, P3-T3, P1-T10.3]
├── P3-T8 Cost Controls [depends: P3-T1]
└── P3-T9 Onboarding Stage 2 [depends: P2-T8, P2-T9]

Phase 4 (Scale & Self-Serve)
├── P4-T1 Self-Serve Portal [depends: P2-T5, P3-T9] [BLOCKING]
├── P4-T2 Observability Dashboard [depends: P2-T6]
├── P4-T3 Bridge Suggestions [depends: P3-T3, P3-T4]
├── P4-T4 Horizontal Scaling [depends: P2-T1]
├── P4-T5 Filter/View Modes [depends: P1-T10.4, P1-T10.5]
└── P4-T6 Analytics [depends: P3-T7.9]
```

---

## Agent Coordination Matrix (OpenClaw Architecture)

### Parallel Work Streams

| Stream | Tasks | Specialty |
|--------|-------|-----------|
| **Infrastructure** | P0-T1, P0-T3, P2-T1, P4-T4 | DevOps, Coolify, CI/CD |
| **Data** | P0-T2, P1-T1, P1-T9, P3-T4 | Data processing, GeoJSON, YAML |
| **Globe/Frontend** | P1-T2..T6, P1-T10, P3-T5, P4-T5 | Three.js, React, WebGL |
| **Node Cards/UI** | P1-T7, P2-T7, P4-T1, P4-T2 | React, UX, WebSocket |
| **Skill Pack Development** | P2-T2, P2-T3, P2-T4, P3-T1, P3-T3 | OpenClaw skills, TypeScript |
| **Config Agent** | P2-T5, P2-T6 | Meta-agent, Coolify API |
| **CLI/Tooling** | P3-T6, P3-T2 | Node.js CLI, npm |
| **Documentation** | P0-T5, P2-T8, P3-T9 | Technical writing |

### Critical Path

```
P0-T1 → P0-T2 → P0-T3 → P1-T2 → P1-T10 → P2-T1 → P2-T5 → P2-T6 → P3-T1 → P4-T1
```

**Key simplification:** Phase 2 critical path is shorter because skill pack development (P2-T2, P2-T3, P2-T4) can run in parallel during P2-T1.

### Parallelization Opportunities

**Within Phase 1 (after P1-T2):**
- P1-T3 (Choropleth) + P1-T4 (Markers) + P1-T5 (Arcs) can run in parallel

**Within Phase 2 (after P2-T1):**
- P2-T2 (vault-rag) + P2-T3 (github-steward) + P2-T4 (librarian) can ALL run in parallel
- P2-T7 (Chat UI) can start as soon as P2-T6 (first deployment) completes
- P2-T8 (Onboarding docs) can start during P2-T5 (Config Agent)

**Within Phase 3:**
- P3-T2 (Format) + P3-T4 (Seeds) + P3-T6 (CLI) can run in parallel
- P3-T5 (Viz) + P3-T8 (Costs) can run in parallel

**Within Phase 4:**
- P4-T2 (Observability) + P4-T3 (Suggestions) + P4-T5 (Filters) + P4-T6 (Analytics) can all run in parallel

---

## Success Metrics by Phase (OpenClaw Architecture)

| Phase | Key Metric | Target |
|-------|------------|--------|
| 0 | CI/CD operational | All workflows passing |
| 1 | Globe load time | < 3 seconds |
| 1 | Seed nodes live | 5 nodes |
| 2 | Coolify server operational | Health checks passing |
| 2 | Skill pack complete | All 5 skills working |
| 2 | Agent response time | < 2 seconds (P50) |
| 2 | External nodes onboarded | 10 nodes |
| 3 | Federation queries/day | 100+ |
| 3 | Active bridges | 5+ |
| 4 | Self-serve node creation time | < 15 minutes |
| 4 | Total active nodes | 25+ |

### Development Time Comparison

| Phase | Original Est. | OpenClaw Est. | Savings |
|-------|--------------|---------------|---------|
| Phase 2 | ~200 hours | ~82 hours | 59% |
| Phase 3 (Fed.) | ~60 hours | ~40 hours | 33% |
| **Total** | **~260 hours** | **~122 hours** | **53%** |

*Savings are from not building custom agent runtime, message routing, memory system, process orchestration — all provided by OpenClaw + Coolify.*

---

## Risk Mitigations per Phase (OpenClaw Architecture)

| Phase | Risk | Mitigation Task |
|-------|------|-----------------|
| 0 | Repository structure changes | Lock structure in P0-T1 |
| 1 | WebGL compatibility | P1-T2.6 capability detection |
| 1 | Tile loading performance | P1-T3.6, P1-T11 optimization |
| 2 | Coolify complexity | Use official Coolify docs + community support |
| 2 | OpenClaw updates | Pin Docker image version, test before upgrade |
| 2 | RAG quality | P2-T2.2 chunking algorithm (skill pack) |
| 3 | Federation latency | P3-T1 timeout handling (federation skill) |
| 3 | Bridge accuracy | P3-T3.5 preserve-original fallback |
| 4 | Portal UX complexity | P4-T1.12 user testing |

### New Risks (OpenClaw Architecture)

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenClaw breaking changes | High | Pin image version, monitor releases |
| Coolify API changes | Medium | Abstract API calls in Config Agent skill |
| Skill pack compatibility | Medium | Write integration tests for each skill |
| Single-server failure | High | Document failover procedure, automate backups |

---

*— End of Implementation Plan —*
