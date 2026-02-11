# librarian Skill

Knowledge ingestion, categorization, and vault organization.

## Purpose

This skill enables the agent to accept new content from conversations, categorize it appropriately, and integrate it into the vault structure. It acts as the "librarian" of the knowledge commons.

## Tools

### `ingest_content`

Accept content from a conversation and prepare it for the vault.

**Parameters:**
- `topic` (string, required): Main topic or title
- `content` (string, required): The content to add
- `source` (string, optional): Where the content came from
- `suggested_path` (string, optional): Suggested file path
- `tags` (array, optional): Tags to apply

**Returns:**
```json
{
  "file_path": "governance/water-rights-update.md",
  "content_preview": "...",
  "category": "governance",
  "tags": ["water", "policy", "2024"],
  "ready_to_commit": true
}
```

### `categorize_page`

Auto-categorize content based on the vault's schema.

**Parameters:**
- `content` (string, required): Content to categorize
- `title` (string, optional): Page title for context

**Returns:**
```json
{
  "primary_category": "governance",
  "subcategory": "water-policy",
  "suggested_path": "governance/water-policy/new-page.md",
  "confidence": 0.87,
  "alternative_categories": [
    { "category": "ecology", "confidence": 0.45 }
  ]
}
```

### `suggest_topics`

Analyze query patterns and suggest topics that should be documented.

**Parameters:**
- `period_days` (number, optional): Analyze queries from last N days

**Returns:**
```json
{
  "suggested_topics": [
    {
      "topic": "Prior appropriation doctrine",
      "query_count": 12,
      "existing_coverage": "partial",
      "suggested_action": "Expand governance/water-rights.md"
    }
  ]
}
```

### `get_vault_schema`

Get the vault's organizational schema.

**Returns:**
```json
{
  "directories": [
    {
      "path": "governance/",
      "description": "Governance frameworks and policies",
      "file_count": 23
    },
    {
      "path": "ecology/",
      "description": "Ecological data and monitoring",
      "file_count": 31
    }
  ],
  "tags": ["water", "policy", "species", "climate"],
  "conventions": {
    "file_naming": "kebab-case",
    "frontmatter_required": true
  }
}
```

### `find_related`

Find related pages for a given topic.

**Parameters:**
- `topic` (string, required): Topic to find relations for
- `limit` (number, optional): Maximum results

**Returns:**
```json
{
  "related_pages": [
    {
      "path": "governance/water-rights.md",
      "relevance": 0.92,
      "section": "Prior Appropriation"
    }
  ],
  "suggested_links": [
    "[[water-rights#prior-appropriation|Prior Appropriation]]"
  ]
}
```

## Content Processing

### Frontmatter Generation

The librarian automatically generates frontmatter for new pages:

```yaml
---
title: Water Rights Update 2024
created: 2024-02-10
updated: 2024-02-10
author: contributed-via-agent
tags: [water, policy, 2024]
status: draft
---
```

### Link Suggestions

When ingesting content, the librarian identifies potential wiki-links:

```markdown
Original: "The Colorado River Compact governs water allocation."
Suggested: "The [[colorado-river-compact|Colorado River Compact]] governs water allocation."
```

## Configuration

Environment variables:
- `VAULT_SCHEMA_PATH`: Path to schema.yaml (optional)
- `DEFAULT_CATEGORY`: Fallback category for uncategorizable content

## Vault Schema Format

The librarian reads `schema.yaml` in the vault root:

```yaml
directories:
  governance:
    description: Governance frameworks, policies, and agreements
    subdirectories:
      - water-policy
      - land-use
      - community-governance

  ecology:
    description: Ecological data, species, and monitoring
    subdirectories:
      - species
      - watersheds
      - climate

tags:
  - water
  - policy
  - species
  - climate
  - community

conventions:
  file_naming: kebab-case
  require_frontmatter: true
  require_tags: true
  max_heading_depth: 3
```
