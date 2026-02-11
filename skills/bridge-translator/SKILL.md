# bridge-translator Skill

Schema bridge vocabulary translation for federated queries.

## Purpose

This skill translates vocabulary between nodes with different schemas, enabling meaningful federated queries across the bioregional network. It loads bridge files from the index registry and applies term mappings.

## Bridge File Format

Bridges are YAML files in the registry:

```yaml
bridge_id: NA19-NA15
version: 1.0.0
last_updated: 2024-02-10

nodes:
  source:
    node_id: colorado-plateau-water
    display_name: Colorado Plateau Watershed Commons
    schema_version: 1.0.0
  target:
    node_id: sierra-nevada-water
    display_name: Sierra Nevada Water Systems
    schema_version: 1.0.0

vocabulary:
  - source_term: water rights
    target_term: appropriative rights
    confidence: 0.95
    notes: "Colorado uses 'water rights', Sierra Nevada prefers 'appropriative rights'"

  - source_term: prior appropriation
    target_term: first in time, first in right
    confidence: 0.90

  - source_term: watershed governance
    target_term: basin management
    confidence: 0.85

structure:
  - source_path: governance/
    target_path: policy/

taxonomies:
  - name: water_categories
    mapping:
      surface_water: river_water
      groundwater: aquifer_water

query_translation:
  - source_pattern: "{topic} in {region}"
    target_pattern: "{topic} for {region}"

bidirectional: true

maintainers:
  - github: water-steward-1
  - github: sierra-steward-2

review_schedule: quarterly
```

## Tools

### `translate_query`

Translate a query using available bridges.

**Parameters:**
- `query` (string, required): The query to translate
- `source_node` (string, required): Source node ID
- `target_node` (string, required): Target node ID

**Returns:**
```json
{
  "original_query": "What are the water rights in the Colorado Plateau?",
  "translated_query": "What are the appropriative rights in the Colorado Plateau?",
  "bridge_id": "NA19-NA15",
  "translations": [
    {
      "original": "water rights",
      "translated": "appropriative rights",
      "confidence": 0.95
    }
  ],
  "confidence": 0.92
}
```

### `translate_response`

Translate a response back to source vocabulary.

**Parameters:**
- `response` (string, required): Response text
- `bridge_id` (string, required): Bridge used for original translation
- `reverse` (boolean, optional): Translate in reverse direction

### `list_bridges`

Get all available bridges for a node.

**Parameters:**
- `node_id` (string, optional): Filter bridges for specific node

**Returns:**
```json
{
  "bridges": [
    {
      "bridge_id": "NA19-NA15",
      "source_node": "colorado-plateau-water",
      "target_node": "sierra-nevada-water",
      "vocabulary_count": 23,
      "last_updated": "2024-02-10",
      "bidirectional": true
    }
  ]
}
```

### `get_bridge`

Get details of a specific bridge.

**Parameters:**
- `bridge_id` (string, required): Bridge identifier

### `suggest_bridge`

Analyze two nodes and suggest bridge mappings.

**Parameters:**
- `source_node` (string, required): Source node ID
- `target_node` (string, required): Target node ID

**Returns:**
```json
{
  "suggested_mappings": [
    {
      "source_term": "water rights",
      "target_term": "appropriative rights",
      "confidence": 0.75,
      "reason": "High co-occurrence in similar contexts"
    }
  ],
  "schema_overlap": 0.65,
  "recommendation": "Bridge creation recommended"
}
```

## Translation Algorithm

1. **Load Bridge**: Fetch bridge YAML from registry
2. **Tokenize Query**: Split into meaningful units
3. **Match Terms**: Find vocabulary matches
4. **Apply Translations**: Replace matched terms
5. **Apply Patterns**: Match and apply query patterns
6. **Calculate Confidence**: Average of individual translation confidences

## Confidence Scoring

- 0.9+: High confidence, direct term mapping
- 0.7-0.9: Good confidence, contextual mapping
- 0.5-0.7: Moderate confidence, may need verification
- <0.5: Low confidence, consider skipping

## Configuration

Environment variables:
- `BRIDGE_CACHE_TTL`: Cache duration in seconds (default: 3600)
- `REGISTRY_URL`: URL to fetch bridges from

## Best Practices

### Bridge Authoring

1. Start with high-confidence, obvious mappings
2. Add notes explaining non-obvious translations
3. Mark confidence levels honestly
4. Include bidirectional flag when appropriate
5. Review quarterly to catch schema drift

### Translation

1. Preserve untranslated terms (don't guess)
2. Log translation notes for transparency
3. Show confidence scores to users
4. Allow override for specific queries
