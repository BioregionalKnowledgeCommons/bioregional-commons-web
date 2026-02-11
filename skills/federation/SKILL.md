# federation Skill

Agent-to-agent query routing and federated knowledge access.

## Purpose

This skill enables agents to route queries to peer nodes in the bioregional knowledge network, synthesize responses from multiple sources, and provide properly attributed federated answers.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Query Classification                          │
│                                                                  │
│  User Query → Classify → Local Search? → YES → vault-rag        │
│                    ↓                                             │
│                   NO                                             │
│                    ↓                                             │
│            Peer Selection → Bridge Translation → Federated Query │
│                    ↓                                             │
│            Response Synthesis → Attributed Answer                │
└─────────────────────────────────────────────────────────────────┘
```

## Tools

### `federated_query`

Route a query to peer nodes in the network.

**Parameters:**
- `query` (string, required): The query to send
- `target_nodes` (array, optional): Specific nodes to query
- `max_peers` (number, optional): Maximum peers to query (default: 3)
- `use_bridges` (boolean, optional): Apply bridge translation (default: true)
- `timeout_ms` (number, optional): Query timeout (default: 10000)

**Returns:**
```json
{
  "local_results": [...],
  "federated_results": [
    {
      "node_id": "sierra-nevada-water",
      "node_name": "Sierra Nevada Water Systems",
      "response": "...",
      "confidence": 0.85,
      "sources": [
        { "path": "snowpack/monitoring.md", "section": "Annual Trends" }
      ],
      "bridge_used": "NA19-NA15",
      "translations_applied": [
        { "original": "water rights", "translated": "appropriative rights" }
      ]
    }
  ],
  "synthesis": "Based on local and federated knowledge...",
  "attribution": "Sources: Colorado Plateau Commons (local), Sierra Nevada Water Systems (federated)"
}
```

### `list_peers`

Get available peer nodes for federation.

**Returns:**
```json
{
  "peers": [
    {
      "node_id": "sierra-nevada-water",
      "display_name": "Sierra Nevada Water Systems",
      "bioregion_codes": ["NA15"],
      "thematic_domain": "watershed-governance",
      "has_bridge": true,
      "bridge_id": "NA19-NA15",
      "status": "online"
    }
  ]
}
```

### `receive_query`

Handle an incoming federated query from a peer. (Called by HTTP endpoint)

**Parameters:**
- `query_id` (string): Unique query identifier
- `source_node_id` (string): Requesting node
- `query_text` (string): The query
- `translated_query_text` (string, optional): Pre-translated query
- `bridge_id` (string, optional): Bridge used for translation
- `max_response_tokens` (number, optional): Response length limit

### `get_federation_stats`

Get statistics about federation activity.

**Returns:**
```json
{
  "queries_sent": 47,
  "queries_received": 23,
  "avg_response_time_ms": 1250,
  "most_queried_peers": ["sierra-nevada-water", "cascadia-governance"],
  "most_used_bridges": ["NA19-NA15"]
}
```

## Federation Protocol

### Endpoints

Each agent exposes:
- `POST /federation/query` - Receive federated query
- `GET /federation/health` - Health check
- `GET /federation/manifest` - Node capabilities

### Request Format

```json
{
  "query_id": "uuid",
  "source_node_id": "colorado-plateau-water",
  "query_text": "What are the water allocation policies?",
  "translated_query_text": "What are the appropriative rights frameworks?",
  "bridge_id": "NA19-NA15",
  "context": {
    "bioregion_code": "NA19",
    "thematic_domain": "watershed-governance"
  },
  "max_response_tokens": 500
}
```

### Response Format

```json
{
  "query_id": "uuid",
  "responding_node_id": "sierra-nevada-water",
  "response_text": "...",
  "confidence": 0.85,
  "translation_notes": [...],
  "source_documents": [...]
}
```

## Query Classification

The skill classifies queries to determine if federation is needed:

1. **Local**: Query can be answered from local vault
2. **Federated**: Query requires knowledge from peer nodes
3. **Unknown**: Query cannot be answered locally, no relevant peers

Classification factors:
- Local vault confidence score
- Query mentions other bioregions
- Query topic not in local schema
- Explicit user request for federated search

## Peer Selection Algorithm

```typescript
function selectPeers(query, context) {
  const candidates = registry.getAllPeers();

  return candidates
    .filter(peer => peer.status === 'online')
    .map(peer => ({
      ...peer,
      score: calculateScore(peer, query, context)
    }))
    .filter(p => p.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function calculateScore(peer, query, context) {
  let score = 0;

  // Bioregion proximity (geographic relevance)
  score += bioregionProximity(peer.bioregion_codes, context.bioregion) * 0.3;

  // Thematic domain overlap
  score += domainOverlap(peer.thematic_domain, context.domain) * 0.3;

  // Bridge availability (easier translation)
  if (hasBridge(peer.node_id)) score += 0.2;

  // Historical query success
  score += historicalSuccess(peer.node_id) * 0.2;

  return score;
}
```

## Configuration

Environment variables:
- `FEDERATION_ENABLED`: Enable/disable federation (default: true)
- `FEDERATION_TIMEOUT_MS`: Query timeout (default: 10000)
- `MAX_FEDERATION_PEERS`: Maximum peers per query (default: 3)
- `REGISTRY_URL`: URL to fetch peer list

## Cost Implications

Federation uses the requesting node's API key, so:
- Query originator pays for local + remote processing
- Each federated response consumes tokens
- Set `max_response_tokens` to control costs
