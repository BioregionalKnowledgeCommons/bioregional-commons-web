# Release B Plan: Knowledge Panel, Node Territories, Chat Integration

## Context

Release A is complete and deployed at https://45.132.245.30.sslip.io/commons/. The app shows 4 live KOI nodes (Salish Sea coordinator, Greater Victoria, Front Range, Cowichan Valley), with directional federation arcs, always-on labels, and no seed data.

Release B makes the dashboard more useful and visually compelling:
1. **Knowledge Panel** — Clicking a node opens a rich side panel with tabs (Overview, Knowledge, Chat, Network)
2. **Node Territory Visualization** — Nodes display as colored bioregion overlays, not just pin markers
3. **Per-Node Chat** — Each node's panel has a chatbot powered by KOI /query + /search endpoints
4. **Global Chat** — A meta-chatbot alongside the search bar that can route questions to node agents

## Phases

### Phase 1: Foundation
- `bffPost()` in bff-fetch.server.ts
- BFF routes: query, search (already exists), subgraph
- Hooks: useNodeQuery, useNodeSearch, useSubgraph
- New types in types/index.ts

### Phase 2: Knowledge Panel (replaces LiveNodeCard)
- Tabbed KnowledgePanel.tsx with Overview, Knowledge, Chat, Network tabs
- OverviewTab: refactored from LiveNodeCard
- KnowledgeTab: entity browser + d3-force graph view
- NetworkTab: federation edges

### Phase 3: Node Territory Visualization
- BioregionLayer node-aware coloring
- Node color assignments
- Click bioregion with node → select node

### Phase 4: Per-Node Chat
- Chat BFF route with rate limiting
- ChatTab component with message history
- useChat mutation hook

### Phase 5: Global Chat
- Fan-out BFF route to all nodes
- GlobalChat drawer component
- Integration with search overlay

## Dependencies
- d3-force + @types/d3-force for graph view

## Execution Order
1. Foundation → 2. Knowledge Panel → 3. Node Territories → 4. Per-Node Chat → 5. Global Chat → Deploy
