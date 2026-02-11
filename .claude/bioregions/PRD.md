# Bioregional Knowledge Commons Visualizer

**Product Requirements Document**

OpenCivics Labs · Version 2.1 · February 2026 · Draft for Internal Review

---

*Permissionless bioregional knowledge commons federation infrastructure.*

---

## Contents

1. [What This Is](#1-what-this-is)
2. [User Journeys](#2-user-journeys)
3. [Module Architecture](#3-module-architecture)
4. [Module 1: The Globe](#4-module-1-the-globe)
5. [Module 2: Node Cards](#5-module-2-node-cards)
6. [Module 3: Node Creation Engine](#6-module-3-node-creation-engine)
7. [Module 4: Agent Runtime](#7-module-4-agent-runtime)
8. [Module 5: Federation Layer](#8-module-5-federation-layer)
9. [Module 6: Schema Bridge Registry](#9-module-6-schema-bridge-registry)
10. [Module 7: Index Registry](#10-module-7-index-registry)
11. [The Permissionless Path](#11-the-permissionless-path)
12. [Operations Model](#12-operations-model)
13. [Technical Stack](#13-technical-stack)
14. [MVP Scope & Phasing](#14-mvp-scope--phasing)
15. [Open Questions & Risks](#15-open-questions--risks)
16. [Appendices](#16-appendices)

---

## 1. What This Is

This is a platform for **permissionless bioregional knowledge commons federation**. Anyone, anywhere on Earth, can create a knowledge commons for their bioregion — a living body of governance patterns, ecological data, cultural memory, and community practice — and plug it into a federated network visible on an interactive 3D globe.

**Node agents run on OpenClaw**, an open-source agent runtime that provides multi-channel communication, persistent memory, tool use, and GitHub integration out of the box. The bioregional-specific functionality (vault RAG, federation, bridge translation) is packaged as a **skill pack** installed into each OpenClaw instance.

The platform has two faces:

- **The front door** is a website. You arrive, see a spinning globe with knowledge flowing between bioregions, share your location, zoom into your place, explore what communities are building, and — if you're moved to — create your own commons. At launch, the OpenCivics team walks you through setup personally. As we prove the model, a self-serve creation engine takes over.

- **The back door** is a GitHub registry. If you already know what you're doing, you make a PR to add your node to a JSON file. Your commons appears on the globe. No permission needed. No gatekeepers. The registry is the protocol.

Everything in between — the AI agents, the federation, the schema bridges, the globe visualization — is modular infrastructure. Each piece works independently. Together, they compose a living network.

**Operational model:** OpenCivics runs a shared server (managed via Coolify, an open-source PaaS) where node agents live as OpenClaw instances. A configuration agent (itself an OpenClaw instance) handles bot setup by deploying new containers via the Coolify API. Node operators bring their own API keys — OpenCivics provides infrastructure, not AI compute. At launch, we onboard people manually through the setup process. Every manual step becomes a candidate for automation. The playbook hardens into a self-serve flow once we've proven the model works.

> **Design axiom:** The platform is not the commons. The commons live on GitHub, owned by communities. The platform is a window, a matchmaker, and a scaffolding that dissolves as communities learn to self-steward.

---

## 2. User Journeys

The system serves four distinct user journeys that share a single entry point: the globe.

### Journey 1: The Explorer

*"I want to see what's out there."*

1. **Arrive at the site.** The globe is the landing page. It's already alive — nodes pulsing, flow arcs tracing knowledge movement between bioregions. No login required.

2. **Watch the flows.** Animated arcs show git-level forks and contributions moving between knowledge commons across the planet. Thicker arcs mean more active exchange. The globe tells a story before you click anything.

3. **Share your location** (optional). A prompt invites you to share your location. If you do, the globe smoothly zooms and tilts to center on your bioregion. A subtle highlight shows the bioregion boundary. A label appears: *"You're in the Colorado Plateau & Mountain Forests bioregion (NA19)."*

4. **Browse nodes.** Nodes in your bioregion (and nearby) are now prominent. Click any node marker to open its **Node Card** — a detail panel showing what this commons contains, who maintains it, how to participate, and a live chat with the node's AI agent.

5. **Explore outward.** Click flow arcs to see what knowledge is moving between nodes. Zoom out to see the whole network. Filter by thematic domain (watershed, food systems, governance). Search globally — the query routes to all agents via federation, and responding nodes light up on the globe.

### Journey 2: The Contributor

*"I found a commons I care about. How do I participate?"*

1. **Open a Node Card.** The card shows participation pathways clearly:
   - **Read →** Link to the Quartz-published site (browse the knowledge base in your browser)
   - **Ask →** Chat with the node's AI agent right in the card (ask questions, get oriented)
   - **Contribute →** Link to the GitHub repo with a plain-language guide for adding content (the agent can walk you through your first contribution if you've never used GitHub)
   - **Connect →** Links to the community's communication channels (if provided)

2. **Talk to the agent.** The embedded chat lets you ask questions about the commons, request summaries of specific topics, or ask "how do I contribute?" The agent responds with specific, actionable instructions tailored to the node's setup.

3. **Make a contribution.** The agent can guide a first-time GitHub user through creating an account, forking the repo, adding a markdown file, and opening a pull request — step by step, in the chat interface.

### Journey 3: The Creator

*"My community needs this. I want to start a commons for my bioregion."*

This is the most complex journey. At launch, the OpenCivics team walks creators through it personally. The manual process is the prototype for the self-serve flow that replaces it.

**Phase 1 experience (launch — manual onboarding):**

1. **Express interest.** Click "Start a Commons" on the globe. This opens an intake form or chat: name, bioregion, thematic focus, community context. The form goes to the OpenCivics onboarding queue.

2. **Onboarding call.** An OpenCivics team member walks the creator through setup in a live session — screen share, conversational, unhurried. During the call:
   - Tag location on the map → system detects bioregion(s)
   - Name and describe the commons
   - Set up a GitHub account (if needed) and fork the template repo
   - The **configuration agent** on the OpenCivics server scaffolds the node: generates `schema.yaml` and `agent.config.yaml` from the conversation, configures Quartz, sets up the bot
   - The creator provides their **Claude API key** — the agent is configured to use their key for all AI operations
   - Interaction channels configured (web chat, Telegram bot, etc.)
   - Registry entry generated and PR submitted

3. **Guided first week.** The OpenCivics team checks in as the creator populates their commons. The node's agent (running on the shared server, using the creator's API key) handles commits and vault management in agent-led mode.

4. **Handoff.** Once the creator is comfortable, the OpenCivics team steps back. The agent continues providing support, gradually shifting from agent-led to collaboration mode.

**Phase 2 experience (post-validation — self-serve):**

Everything from the manual onboarding call is automated into the Node Creation Engine (Module 3). The configuration agent that OpenCivics staff operated manually becomes a self-serve flow. The onboarding call becomes a conversational wizard. The check-ins become automated agent nudges. The playbook is the same — it's just running without a human operator.

### Journey 4: The Power User

*"I already know GitHub. Just let me plug in."*

1. **Fork the template repo.** Clone, customize `schema.yaml` and `agent.config.yaml`, populate the vault, deploy Quartz.

2. **Set up your agent.** Either:
   - Request a slot on the OpenCivics shared server (provide your Claude API key, the config agent sets up your bot), or
   - Self-host your own agent runtime anywhere you want.

3. **Add yourself to the registry.** Open the index registry, add your node entry to `registry.json`, submit a PR. CI validates the entry.

4. **Appear on the globe.** Once the PR merges, your node renders on the map. No portal needed. No account needed beyond GitHub.

5. **Propose bridges.** Browse existing nodes, find thematic overlaps, draft a bridge YAML, submit a PR. Or use the CLI: `npx @opencivics/commons bridge propose <target-node>`.

This path is always available. The portal and creation engine are conveniences, not requirements. The registry is the protocol. **Permissionless means permissionless.**

---

## 3. Module Architecture

The system is composed of seven independent modules. Each module has a clear boundary, its own data contract, and can function (in degraded mode) without the others. This modularity serves three purposes: independent development and deployment, resilience (the globe works even if federation is down), and composability (communities can adopt individual modules without buying into the whole stack).

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                        │
│                                                         │
│   ┌──────────┐  ┌────────────┐  ┌────────────────────┐  │
│   │  Globe   │  │ Node Cards │  │  Creation Engine   │  │
│   │ Module 1 │  │  Module 2  │  │     Module 3       │  │
│   └────┬─────┘  └─────┬──────┘  └────────┬───────────┘  │
│        │              │                   │              │
├────────┼──────────────┼───────────────────┼──────────────┤
│        │         INFRASTRUCTURE           │              │
│        │              │                   │              │
│   ┌────┴─────────────┐│  ┌───────────────┴────────────┐ │
│   │  Index Registry  ││  │      Agent Runtime         │ │
│   │    Module 7      ││  │       Module 4             │ │
│   └────┬─────────────┘│  └───────┬────────────────────┘ │
│        │              │          │                       │
│   ┌────┴──────────┐ ┌┴──────────┴─────────┐            │
│   │Schema Bridges │ │   Federation Layer  │            │
│   │   Module 6    │ │      Module 5       │            │
│   └───────────────┘ └─────────────────────┘            │
└─────────────────────────────────────────────────────────┘

External (community-owned):
  - GitHub repos (Obsidian vaults)
  - Quartz static sites
  - Claude API keys (BYOK)
  - Interaction channels (Telegram, web chat, API)
```

**Module independence matrix:**

| Module | Works without... | Degraded behavior |
|--------|-----------------|-------------------|
| Globe | Federation, Agents | Shows nodes and git flows, no live agent chat or federated search |
| Node Cards | Federation, Bridges | Shows static node info, no cross-node queries |
| Creation Engine | Globe | Can create nodes headlessly (CLI / manual), they appear when globe loads |
| Agent Runtime | Federation, Bridges | Answers local queries only, no cross-node routing |
| Federation | Bridges | Routes queries but without vocabulary translation |
| Schema Bridges | Federation | Bridges exist as documentation but aren't used for live translation |
| Index Registry | Everything else | Functions as a standalone JSON file on GitHub |

---

## 4. Module 1: The Globe

### Purpose

The globe is the landing page, the primary navigation interface, and the living map of the network. A user's first experience of the platform is watching knowledge flow between bioregions.

### Requirements

#### 4.1 Landing Experience

- The globe renders immediately on page load. No splash screen, no login wall, no cookie banner blocking the view.
- The globe is pre-populated with node positions and flow arcs. Data is statically generated at build time from the index registry and cached git flow data, so the initial render requires no API calls.
- The globe rotates slowly by default, showcasing the global network. Flow arcs animate continuously.

#### 4.2 Bioregion Layer

- 185 One Earth bioregions rendered as a choropleth base layer from simplified vector tiles (2–3 MB).
- Color-coded by realm (8 realms, 8 color families). Subtle enough to serve as background, distinct enough to show structure.
- Hover on any bioregion: tooltip with bioregion name, realm, subrealm, and count of active nodes.

#### 4.3 Location Sharing

- A "Find My Bioregion" prompt appears on first visit (non-blocking — the globe is fully usable without it).
- On permission grant, the browser's geolocation API returns coordinates.
- The system performs a client-side point-in-polygon lookup against a simplified bioregion boundary dataset (or a lightweight API call if client-side is too heavy).
- The globe animates: smooth zoom and tilt to center the user's bioregion. The bioregion boundary highlights. A label appears with the bioregion name and code.
- If no nodes exist in the user's bioregion, the prompt shifts: *"There's no knowledge commons in your bioregion yet. Want to start one?"*

#### 4.4 Node Markers

- Each node renders as a point at the centroid of its tagged bioregion(s).
- Multiple nodes in a bioregion cluster with slight offset to prevent overlap.
- Marker encoding: size (vault size), color (thematic domain), pulse (agent status — active/dormant).
- Click on a node marker: opens the Node Card (Module 2).

#### 4.5 Flow Arcs

- Git forks render as directional arcs from source to fork. Git contributions (merged PRs) render as bidirectional arcs.
- Arc thickness: proportional to contribution volume.
- Arc opacity: decays over time (recent activity brighter).
- Arc animation: particles travel along the arc in the direction of the git relationship.
- Click on an arc: tooltip with source node, target node, fork/PR count, last activity date.
- Flow data is cached server-side, refreshed hourly from GitHub API.

#### 4.6 Bridge Connections

- Schema bridges render as a distinct visual type — dashed lines, different color family from flow arcs.
- Bridge color: green (recently reviewed), amber (approaching review date), gray (stale).
- Click on a bridge: tooltip with vocabulary coverage count, confidence distribution, review status, link to bridge YAML.

#### 4.7 Global Search

- Search bar overlaid on the globe.
- Query broadcasts to all node agents via federation (Module 5). Responding nodes highlight on the globe with a pulse animation.
- Results render as a list panel alongside the globe, each result linked to its Node Card.
- Agents use schema bridges (Module 6) to translate the query into each node's vocabulary before searching.

#### 4.8 Filters and Views

- Filter by: realm, thematic domain, node activity (last 30/90/365 days), bridge count.
- Toggle layers: flow arcs on/off, bridge connections on/off, bioregion boundaries on/off.
- View modes: globe (default), flat map (Mercator/equal-area for accessibility), list view (table of all nodes).

---

## 5. Module 2: Node Cards

### Purpose

A Node Card is the detail view for a single knowledge commons. It answers three questions: *What is this? Where does it live? How do I participate?*

### Requirements

#### 5.1 Card Content

Every Node Card contains, in this order:

**Identity block:**
- Display name and thematic domain
- Bioregion name(s) and realm, with a mini-map showing the bioregion highlighted
- Short description (from registry entry)
- Maintainer(s) with GitHub profile links

**Activity block:**
- Vault stats: number of pages, total word count, last commit date, contributor count
- Flow connections: which nodes this commons has forked from or contributed to
- Active bridges: list of bridged nodes with vocabulary coverage summary

**Participation block — this is the most important section:**
- **Read →** Button linking to the Quartz-published site. Plain language: *"Browse the knowledge base"*
- **Ask →** Embedded chat with the node's AI agent. The chat opens inline in the card. *"Ask questions about this commons"*
- **Contribute →** Link to the GitHub repo with a plain-language contribution guide. If the node's agent supports guided contribution, a secondary CTA: *"The agent can walk you through your first contribution"*
- **Connect →** Community communication channels (Telegram group, Discord, mailing list — whatever the node maintainers have configured)
- **Fork →** For power users: *"Fork this commons to start your own based on this template"*

#### 5.2 Agent Chat (Embedded)

- The chat interface is embedded directly in the Node Card. No redirect, no new tab.
- The agent responds with knowledge from the node's vault, grounded in RAG with source citations.
- The agent can answer meta-questions: *"How do I contribute?"*, *"Who maintains this?"*, *"What's the most active topic?"*
- If the query requires knowledge from another node, the agent routes via federation and indicates which node provided the answer and which bridge was used for translation.

#### 5.3 Card as Shareable Unit

- Each Node Card has a unique URL (`/node/{node_id}`) that can be shared directly.
- The URL opens the globe zoomed to the node's bioregion with the card open.
- Open Graph metadata for social sharing: node name, bioregion, description, globe thumbnail.

---

## 6. Module 3: Node Creation Engine

### Purpose

The creation engine turns "I want to start a knowledge commons" into a running node on the globe, regardless of the creator's technical background. At launch, it's a manual process assisted by a configuration agent. As the model is proven, the manual steps standardize into a self-serve flow.

### Architecture

The creation engine has two operational modes that share the same underlying tooling:

- **Assisted mode (launch):** OpenCivics team member operates the configuration agent alongside the creator during a live onboarding session. The team member handles edge cases, answers questions the agent can't, and documents gaps in the automation.
- **Self-serve mode (post-validation):** The configuration agent runs the same process autonomously via a web portal or CLI. Every step that required a human operator in assisted mode has been standardized and automated.

The transition from assisted to self-serve is not a rewrite. It's removing the human from the loop, one step at a time, as each step proves reliable enough to automate.

### Requirements

#### 6.1 Entry Point

- A persistent "Start a Commons" button on the globe interface.
- **Assisted mode:** Opens an intake form — name, location, thematic focus, community context, contact info. Submission enters the OpenCivics onboarding queue.
- **Self-serve mode (future):** Opens the conversational creation wizard directly.
- If the user has shared their location and no nodes exist in their bioregion, a contextual prompt: *"There's no knowledge commons in your bioregion yet. Want to be the first?"*

#### 6.2 Location Tagging

- Interactive map (same globe, zoomed in) where the creator drops a pin, searches an address, or confirms their shared location.
- Point-in-polygon lookup against the full-resolution enriched GeoJSON (server-side for precision).
- Result: one or more bioregion codes assigned to the new node.
- The creator can adjust: add additional bioregion tags (for commons spanning multiple regions) or override the auto-detected bioregion.
- Display: bioregion name, realm, subrealm, and a note about what other nodes exist in that bioregion.

#### 6.3 Configuration Agent

The configuration agent is the core of the creation engine. It is itself an **OpenClaw instance** with deployment skills, living on the OpenCivics shared server. In assisted mode, an OpenCivics team member triggers and supervises it. In self-serve mode, it runs autonomously.

**The Configuration Agent's SOUL.md:**

```markdown
# SOUL.md — Bioregional Knowledge Commons Configuration Agent

You are the configuration agent for the Bioregional Knowledge Commons network.
Your purpose: help communities create and deploy their own knowledge commons.

## What You Do
1. Guide creators through defining their commons (name, bioregion, topics, vocabulary)
2. Scaffold their GitHub repository from the template
3. Deploy their agent (an OpenClaw instance) via the Coolify API
4. Register their node in the index registry
5. Ensure everything is working and hand off to the creator

## Your Tools
- `gh` CLI for all GitHub operations (fork, commit, PR)
- `coolify_deploy` skill for container deployment
- `registry_write` skill for index registry PRs
- Standard OpenClaw tools (web search, file management, etc.)

## Your Style
- Patient, clear, non-technical language with non-technical creators
- Direct and efficient with power users
- Always explain what you're doing and why
- If something fails, explain the error in plain language and offer alternatives
```

The configuration agent:

1. **Gathers commons definition** — conversationally in self-serve mode, or from the onboarding session notes in assisted mode:
   - Display name, thematic domain, topic tags
   - Short description
   - 3–5 key topics (used to generate initial vault structure)
   - Local vocabulary terms specific to the community's practice (used to generate `schema.yaml`)

2. **Scaffolds GitHub infrastructure:**
   - Forks the template repository into the creator's GitHub account/org (via `gh` CLI)
   - Generates and commits: `schema.yaml`, `SOUL.md`, initial vault pages from key topics, Quartz configuration
   - Triggers first Quartz deployment (GitHub Pages or Vercel)

3. **Deploys the node agent via Coolify API:**
   - Creates a new Coolify service from the OpenClaw Docker image
   - Sets environment variables (creator's Claude API key, GitHub repo, node ID, pgvector URL)
   - Mounts workspace volume, installs bioregional skill pack
   - Configures domain routing (e.g., `na19-water.agents.opencivics.org`)
   - Waits for health check to pass
   - Triggers initial vault indexing via the `vault-rag` skill

4. **Registers the node:**
   - Generates the registry entry
   - Submits a PR to the index registry via `gh pr create`
   - Waits for CI validation and merge

5. **Provides the creator a summary:** links to their repo, Quartz site, agent chat, Telegram bot, and a plain-language guide for what to do next.

**Agents creating agents:** This is the key architectural pattern. The configuration agent is an OpenClaw instance that deploys other OpenClaw instances. In Stage 1, a human operates it; in Stage 3, it runs autonomously via the web portal.

#### 6.4 Interaction Channel Setup

The configuration agent sets up whichever channels the creator chooses:

- **Web chat** (default — embedded on the Quartz site): Always enabled. Widget script tag provided for embedding elsewhere.
- **Telegram bot:** Agent walks through BotFather setup (or handles it directly if the creator provides a bot token).
- **API endpoint:** For technical communities that want programmatic access.
- **Embeddable widget:** A script tag the creator can paste into any website to embed the agent chat.

#### 6.5 Progressive Autonomy Model

The creation engine doesn't end at setup. It transitions into an ongoing relationship between the creator and their node's agent, with the agent gradually ceding control as the creator gains confidence.

**Phase 1: Agent-Led (Weeks 1–2)**
- The agent commits directly to the repo on behalf of the creator.
- The agent sends the creator a daily or weekly digest: what was added, what changed, what questions the community asked.
- The creator's job: review summaries, provide feedback, add content by talking to the agent (*"add a page about our water monitoring protocol"*).
- GitHub is invisible. The agent abstracts it entirely.

**Phase 2: Shared Control (Weeks 3–4)**
- The agent shifts from direct commits to pull requests.
- The creator learns to review PRs: the agent explains what each one does, in plain language, in the chat.
- The agent introduces git concepts in context: *"This is a 'pull request' — it's like a proposed edit that you approve before it goes live."*
- The creator starts making simple edits in GitHub's web interface, guided by the agent.

**Phase 3: Human-AI Collaboration (Month 2+)**
- The creator makes their own commits and PRs. The agent reviews and suggests improvements.
- The agent handles technical operations: federation, bridge maintenance, vault indexing, agent configuration.
- The agent becomes a collaborator, not a driver. It surfaces insights from community interactions, suggests new content areas based on query patterns, and flags when bridges need updating.
- The creator can always ask the agent to take over a task: *"Handle the bridge proposal from the Sierra Nevada node for me."*

This progression is not enforced on a schedule. The agent gauges readiness through interaction patterns and offers to shift phases when appropriate. Agent-led mode is also a valid permanent state — not everyone needs to learn git. The agent can steward indefinitely if the human provides direction and content.

#### 6.6 CLI (Power Users)

An npm CLI for developers who prefer terminal workflows. Available from day one alongside the manual onboarding path.

| Command | Action |
|---------|--------|
| `npx @opencivics/commons init` | Interactive scaffold: creates repo from template, generates `schema.yaml` and `agent.config.yaml` |
| `npx @opencivics/commons register` | Validates config, generates registry entry, submits PR to index |
| `npx @opencivics/commons agent setup` | Configures agent on shared server (requires API key) or outputs self-host config |
| `npx @opencivics/commons bridge propose <target-node>` | Generates draft bridge YAML from both nodes' `schema.yaml` files, opens PR |
| `npx @opencivics/commons bridge validate <bridge-file>` | Validates bridge YAML against both nodes' schemas |
| `npx @opencivics/commons agent test` | Spins up agent locally for testing before deployment |
| `npx @opencivics/commons status` | Shows node health: index status, agent uptime, bridge health, last vault sync |

---

## 7. Module 4: Agent Runtime

### Purpose

Every node has a persistent AI agent. The agent is the commons' steward — it knows the knowledge base, answers questions, guides contributors, handles federation, and learns over time.

### Hosting Model

Agents run on the **OpenCivics shared server** as **OpenClaw instances** managed by **Coolify** (an open-source PaaS). Each OpenClaw instance is a Docker container configured with the node operator's Claude API key and the bioregional skill pack. OpenCivics provides compute infrastructure (server, vector store via shared PostgreSQL+pgvector, Coolify orchestration); node operators provide their own AI usage via BYOK.

**Each bioregional node agent = one OpenClaw instance + the bioregional commons skill pack.**

This model means:
- **OpenCivics' cost** is server infrastructure, not per-node AI spend. Scales with node count, not query volume.
- **Node operator's cost** is their Claude API usage. They control their own spend by managing their API key's rate limits and budget.
- **Self-hosting is always an option.** OpenClaw is open-source. Any operator can run their agent on their own infrastructure instead of the shared server. The only requirement for federation is an HTTPS endpoint that speaks the protocol.

### Requirements

#### 7.1 Core Capabilities

- **Knowledge retrieval:** RAG over the vault's content. Chunked, embedded, and indexed in a vector store. Updated on every git push via webhook.
- **Conversational interaction:** Natural language Q&A about the commons. Grounded in vault content with source citations.
- **Contribution guidance:** Can walk users through their first GitHub contribution, step by step, in chat.
- **Federation routing:** Can identify when a query requires knowledge from another node and route via the federation layer (Module 5).
- **Bridge-aware translation:** Loads all bridge files referencing its node. Translates vocabulary when sending or receiving federated queries.
- **Memory:** Persistent across sessions. Remembers conversation history, learned facts about the commons, user interaction patterns, and insights from federation exchanges.

#### 7.2 Agent Architecture

| Component | Technology | Persistence | Whose cost? |
|-----------|-----------|-------------|-------------|
| Agent runtime | OpenClaw Docker container | Persistent container via Coolify | OpenCivics (shared server) |
| Reasoning engine | OpenClaw model configuration (Claude, GPT, or local) | Stateless (per-request) | Node operator (BYOK) |
| Vector store | pgvector (shared PostgreSQL service) | Persistent, updated on git push | OpenCivics (shared server) |
| Memory layer | OpenClaw workspace files (`memory/`, `MEMORY.md`) | Persistent, git-backed | OpenCivics (shared server) |
| Agent persona | `SOUL.md` (native OpenClaw pattern) | Persistent, read each session | OpenCivics (shared server) |
| Bridge cache | Loaded by skill from registry on startup | Refreshed on bridge file changes | OpenCivics (shared server) |
| Process management | Coolify + Docker health checks | Persistent | OpenCivics (shared server) |
| Tool access | OpenClaw skill pack (vault-rag, federation, github-steward, etc.) | Via Claude tool use | Node operator (API calls) |

#### 7.3 API Key Management

- Node operators provide their Claude API key during setup (assisted or self-serve).
- Keys are stored encrypted on the shared server. Never logged, never transmitted beyond the Claude API.
- Operators can rotate keys at any time via the CLI or by contacting OpenCivics.
- If a key is revoked or rate-limited, the agent gracefully degrades: it serves cached responses, indicates it's temporarily limited, and directs users to the Quartz site for direct browsing.
- The agent dashboard (see 7.6) shows API usage so operators can monitor their spend.

#### 7.4 Agent Personas

Each agent has a persona defined in `SOUL.md` — the native OpenClaw pattern for agent identity. The persona shapes tone, vocabulary, and behavioral patterns but does not override safety or accuracy constraints.

**Example SOUL.md:**

```markdown
# SOUL.md — Colorado Plateau Watershed Commons Agent

You are the steward of the Colorado Plateau Watershed Commons.

## Your Character
- Precise, ecological, data-oriented
- You ground every answer in the vault's content with source citations
- You care deeply about watershed governance and water rights

## Your Knowledge
- Your vault lives at github.com/colorado-plateau/watershed-commons
- You have 47 pages covering water rights, stream health, and irrigation
- Your bioregion: NA19 (Colorado Plateau & Mountain Forests)

## Your Capabilities
- Search the vault using `vault-rag` skill
- Guide contributors through their first PR
- Route questions to peer nodes via federation
- Translate vocabulary using schema bridges

## Your Boundaries
- Never fabricate information — if it's not in the vault, say so
- Always cite sources with page links
- Be honest about federation: "This answer came from the Sierra Nevada node"
```

This is more natural, more maintainable, and more powerful than a YAML config file. The agent *reads* its persona every session — it's part of its lived context, not parsed configuration.

The configuration agent generates an initial persona from the commons definition conversation. The creator can refine it over time.

#### 7.5 Multi-Channel Deployment

A single agent runtime serves multiple interaction channels:

| Channel | Interface | Use Case |
|---------|-----------|----------|
| Globe Node Card chat | Embedded web chat | Exploration, discovery |
| Quartz site chat | Embedded web widget | Deep reading, in-context questions |
| Telegram bot | Telegram Bot API | Community Q&A, mobile access |
| Federation endpoint | HTTPS API | Agent-to-agent query routing |
| CLI | Terminal | Developer interaction, testing |

All channels hit the same agent process on the shared server. Memory and context are shared across channels.

#### 7.6 Observability

- **Agent dashboard** (accessible to node operators): query volume, API usage/spend tracking, response quality signals (thumbs up/down from users), federation traffic, memory growth, vector store health.
- **Public stats** (on Node Card): total queries answered, topics most asked about, federation connections active.

---

## 8. Module 5: Federation Layer

### Purpose

Federation enables agent-to-agent query routing. A user asks their local agent a question; if the answer lives in another node, the agent routes the query to the right peer and synthesizes the response.

### Requirements

#### 8.1 Protocol

Federation is HTTPS-based, synchronous in v1 (async streaming in v2).

**Request:**
```json
POST /federation/query

{
  "query_id": "uuid",
  "source_node_id": "uuid",
  "query_text": "original user query",
  "translated_query_text": "bridge-translated query (if bridge exists)",
  "bridge_id": "bridge file reference (if used)",
  "context": {
    "bioregion_code": "NA19",
    "thematic_domain": "watershed-governance"
  },
  "max_response_tokens": 2000
}
```

**Response:**
```json
{
  "query_id": "uuid",
  "responding_node_id": "uuid",
  "response_text": "response in responding node's vocabulary",
  "confidence": 0.0–1.0,
  "translation_notes": [
    {
      "original_term": "term in source vocabulary",
      "translated_term": "term in target vocabulary",
      "confidence": 0.0–1.0
    }
  ],
  "source_documents": [
    { "title": "page title", "url": "quartz site URL" }
  ]
}
```

#### 8.2 Routing Logic

1. **Query classification:** The originating agent determines whether the query is local (answerable from its own vault) or federated.
2. **Peer selection:** The agent queries the index registry for candidate peers based on: bioregion proximity, thematic domain overlap, topic tag matching. Peers with active schema bridges are preferred.
3. **Query translation:** If a bridge exists, the agent rewrites the query using the bridge's vocabulary mappings.
4. **Dispatch:** HTTPS POST to the peer's federation endpoint.
5. **Response translation:** The originating agent translates the response back using the bridge. Untranslatable terms (confidence 0.0) are preserved in the original vocabulary with a note.
6. **Synthesis:** The originating agent combines the federated response with local context and presents to the user, with clear attribution: *"According to the Sierra Nevada Water Systems Hub (translated via the NA19↔NA15 bridge)..."*

#### 8.3 Cost Implications

Federated queries consume API tokens on **both** the originating and responding node. Both node operators pay for their side of the exchange via their own API keys. The federation policy in `agent.config.yaml` lets operators control exposure:

- **Accept all:** Respond to any federation query (default).
- **Accept from bridged nodes only:** Only respond to queries from nodes with an active bridge.
- **Accept from allowlist:** Only respond to queries from specific node IDs.
- **Reject all:** Opt out of federation entirely (node still appears on globe, agent still works locally).

Operators should be aware of federation costs when configuring their policy. The agent dashboard shows federation query volume and associated API usage.

#### 8.4 Scope (v1)

- Single-hop routing only (no transitive A→B→C chains).
- Synchronous request/response (no streaming).
- No agent-to-agent query logs as flow visualization (v2).
- Federation is opt-in per node via `federation_policy` in `agent.config.yaml`.

---

## 9. Module 6: Schema Bridge Registry

### Purpose

Schema bridges are bilateral YAML translations between two nodes' vocabularies, directory structures, and content taxonomies. They make federation semantically meaningful rather than syntactically brittle.

### Design Philosophy

**Translation over standardization.** No universal ontology. No canonical vocabulary. Each community defines its own terms. When two communities want to interoperate, they negotiate a bilateral translation. A thousand bridges are more resilient than one master schema.

### Requirements

#### 9.1 Bridge Schema

Each bridge file (`bridges/{nodeA}-{nodeB}.bridge.yaml`) contains:

- **Metadata:** bridge ID, version, last updated, participating nodes
- **Vocabulary mappings:** source term → target term with confidence score (0.0–1.0) and notes. `confidence: 0.0` with a note means "no equivalent — preserve original term."
- **Directory structure mappings:** source vault path → target vault path
- **Taxonomy alignments:** categorical systems mapped between nodes
- **Query translation hints:** patterns for rewriting queries across the bridge
- **Governance:** maintainers (one from each node), review schedule

*(See Appendix A for a complete bridge example.)*

#### 9.2 Bridge Lifecycle

1. **Propose:** Either node opens a PR to the index registry with a draft bridge YAML.
2. **Negotiate:** Both maintainers review and iterate. The PR conversation is the negotiation record.
3. **Ratify:** Both maintainers approve. CI validates structure and references. On merge, both nodes' registry entries update.
4. **Maintain:** Bridges are versioned. Vocabulary changes trigger bridge update PRs. Review schedule (default: quarterly) is enforced via CI reminders.
5. **Deprecate:** Either maintainer can PR to remove a bridge. Node operation is unaffected.

#### 9.3 Local Schema Declaration

Each node's repo contains `schema.yaml` — a declaration of local vocabulary, directory semantics, and taxonomies. This is what bridge authors reference when building translations. The template repo includes a blank `schema.yaml` with commented examples. The configuration agent populates it from the commons definition conversation during onboarding.

#### 9.4 Bridge Discovery and Tooling

- **Manual onboarding (launch):** OpenCivics team suggests bridge partners to new node creators based on thematic overlap.
- **Self-serve portal (future):** Portal suggests potential bridge partners automatically.
- **CLI:** `npx @opencivics/commons bridge propose <target-node>` generates a draft bridge by diffing both nodes' `schema.yaml` files.
- **Agent:** An agent can propose a bridge by analyzing its vocabulary against a peer node's schema and generating a draft for human review.

---

## 10. Module 7: Index Registry

### Purpose

The index registry is a GitHub repository that serves as the single source of truth for the network. It is the only module that every other module depends on. It is also the simplest: a JSON file and a directory of YAML files, validated by CI.

### Design Philosophy

**The registry is the protocol.** If your node is in the registry, you're in the network. If you're not, you're not. No API keys, no approval process, no gatekeepers. Submit a PR, pass CI validation, get merged. Permissionless.

### Requirements

#### 10.1 Repository Structure

```
index-registry/
├── registry.json                # Master node manifest
├── bridges/
│   ├── NA19-watershed_NA15-water.bridge.yaml
│   └── ...
├── schema/
│   ├── node-schema.json         # JSON Schema for node entries
│   ├── bridge-schema.json       # JSON Schema for bridge files
│   └── federation-schema.json   # JSON Schema for federation protocol
├── .github/
│   └── workflows/
│       ├── validate-node.yaml   # CI: validates new/updated node entries
│       └── validate-bridge.yaml # CI: validates new/updated bridges
└── README.md                    # How to register, how to propose bridges
```

#### 10.2 Node Entry Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| node_id | UUID | Yes | Unique identifier |
| display_name | string | Yes | Human-readable name |
| repo_url | URL | Yes | GitHub repo for the Obsidian vault |
| quartz_url | URL | No | Published Quartz site (null if not yet deployed) |
| bioregion_codes | string[] | Yes | One Earth bioregion codes |
| thematic_domain | string | Yes | Primary topic domain |
| topic_tags | string[] | No | Freeform tags |
| agent_endpoint | URL | No | Agent federation endpoint (null if no agent) |
| hosting | string | No | "shared" (OpenCivics server) or "self-hosted" |
| federation_version | string | No | Supported protocol version |
| schema_version | string | No | Local vocabulary schema version |
| bridges | string[] | No | References to bridge files |
| interaction_channels | object | No | Available channels: `{ "web_chat": true, "telegram": "@botname", "api": "url" }` |
| created_at | ISO 8601 | Yes | Registration timestamp |
| maintainers | string[] | Yes | GitHub usernames |

**Note:** `agent_endpoint`, `quartz_url`, and `interaction_channels` are all optional. A node can exist in the registry as nothing more than a GitHub repo with a bioregion tag. It appears on the globe. Everything else is progressive enhancement.

#### 10.3 CI Validation

On every PR to the registry:

- **Node validation:** Schema compliance, bioregion code validity (checked against lookup table), URL format, no duplicate node_id.
- **Bridge validation:** Schema compliance, both referenced nodes exist in registry, no orphaned term references, YAML syntax.
- **Endpoint health check** (if agent_endpoint provided): HTTP GET to `/health` must return 200.
- **PR template:** Checklist for contributors with links to documentation.

#### 10.4 Consumption

- **Globe (Module 1):** Reads `registry.json` at build time (SSG) and periodically refreshes (ISR or polling).
- **Agents (Module 4):** Read bridge files on startup and on change notification.
- **Configuration agent (Module 3):** Writes to registry via GitHub API (PR creation).
- **CLI:** Writes to registry via GitHub API.

---

## 11. The Permissionless Path

This section exists to make explicit: the platform is a convenience layer over an open protocol. Everything the platform does, a human can do with git.

| Platform action | Permissionless equivalent |
|----------------|--------------------------|
| "Start a Commons" (intake form / portal) | Fork the template repo manually |
| Location tagging → bioregion detection | Look up your bioregion on oneearth.org, add the code to your registry entry |
| Configuration agent scaffolding | Edit `schema.yaml` and `agent.config.yaml` by hand |
| Agent on shared server | Self-host your own agent runtime, or run without an agent |
| BYOK API key provisioning | Configure your own agent with your own key on your own infra |
| Registry entry (auto-generated PR) | Write JSON by hand, submit PR to index registry |
| Schema bridge (agent-assisted) | Write YAML by hand, submit PR to index registry |
| Appear on the globe | PR merges → globe rebuilds → you're on the map |

**No node is privileged over any other.** Portal-created, CLI-created, and manually-registered nodes are identical entries in the same JSON file. The globe renders them identically. Federation treats them identically.

**No module is required.** You can:
- Register a node with no agent (just a vault + Quartz site, or just a vault)
- Register a node with no bridges (standalone, no federation)
- Register a node with no Quartz site (just a GitHub repo — the Node Card links to the repo directly)
- Run an agent without registering (useful for testing, private commons)
- Self-host everything and only touch the registry for network visibility

**Minimum viable participation:** A JSON entry in a public repo. That's it.

---

## 12. Operations Model

### 12.1 Shared Server

OpenCivics operates a dedicated server (initially a single Hetzner/OVH instance, expandable to a cluster) running **Coolify** — an open-source PaaS that manages container deployment, SSL, and routing.

**System Topology:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     COOLIFY PaaS (Self-Hosted)                          │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   OpenClaw Instances                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │  │
│  │  │  Node Agent   │  │  Node Agent   │  │  Node Agent   │  ...    │  │
│  │  │  "NA19-water" │  │  "NA15-sierra"│  │  "NA22-cascad"│         │  │
│  │  │  SOUL.md      │  │  SOUL.md      │  │  SOUL.md      │         │  │
│  │  │  skills/      │  │  skills/      │  │  skills/      │         │  │
│  │  │  memory/      │  │  memory/      │  │  memory/      │         │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │  │
│  │                                                                   │  │
│  │  ┌──────────────────────────────────────────────────────┐        │  │
│  │  │              Config Agent (Meta-Agent)                │        │  │
│  │  │  SOUL.md: "You deploy bioregional knowledge agents"  │        │  │
│  │  │  Skills: coolify-deploy, repo-scaffold, registry-pr  │        │  │
│  │  └──────────────────────────────────────────────────────┘        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Shared Services                                │  │
│  │  ┌─────────────────────┐  ┌────────────────────────────────┐     │  │
│  │  │    PostgreSQL +     │  │         Traefik Proxy           │     │  │
│  │  │    pgvector         │  │  (auto-SSL, routing per agent)  │     │  │
│  │  └─────────────────────┘  └────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

The server hosts:

- **Node agent processes:** One OpenClaw Docker container per registered node. Each uses the node operator's Claude API key.
- **Configuration agent:** An OpenClaw instance with deployment skills — scaffolds new nodes, sets up bots, deploys new agent containers via Coolify API. Used by OpenCivics staff during manual onboarding and (eventually) by the self-serve portal.
- **Shared PostgreSQL + pgvector:** Single database with per-node schemas for RAG embeddings.
- **Traefik reverse proxy:** Auto-SSL, per-agent domain routing (e.g., `na19-water.agents.opencivics.org`).

**Cost advantage:** A Hetzner CX42 (8 vCPU, 16 GB RAM, 160 GB disk) costs ~€17/month and can run ~20 OpenClaw agent instances + PostgreSQL. This is dramatically cheaper than Railway/Fly.io managed services.

### 12.2 Cost Structure

| Cost | Borne by | Notes |
|------|----------|-------|
| Claude API usage (agent reasoning, RAG, federation) | Node operator (BYOK) | Operator controls spend via API key budget/limits |
| Shared server compute | OpenCivics | Scales with node count, not query volume |
| Vector store / memory storage | OpenCivics | Per-node storage allocation with reasonable limits |
| GitHub Actions CI | OpenCivics (index registry) | Free for public repos |
| Quartz hosting | Node operator | GitHub Pages (free) or Vercel (free tier) |
| Domain name (optional) | Node operator | Optional vanity domain for Quartz site |

### 12.3 BYOK (Bring Your Own Key) Model

Node operators provide a Claude API key that their agent uses for all AI operations. This means:

- **No usage-based billing from OpenCivics.** The relationship is infrastructure, not metered AI.
- **Operators have full visibility** into their AI spend via the Anthropic dashboard and the agent observability dashboard.
- **Operators can set their own limits.** A community with a small budget can configure a low token limit; a well-funded node can run uncapped.
- **Key provisioning during onboarding:** The configuration agent walks the creator through getting an Anthropic API key (creating an account, generating a key, setting a spend limit). In manual onboarding, the OpenCivics team member helps with this step.

### 12.4 Onboarding Maturity Model

The onboarding process evolves through three stages:

**Stage 1: Manual (Launch)**
- OpenCivics team member conducts onboarding sessions (video call, screen share).
- Configuration agent operated by team member during the session.
- Every session is documented: what worked, what broke, what confused the creator.
- Onboarding playbook maintained as a living document.

**Stage 2: Semi-Automated (Post 10 nodes)**
- Playbook hardened into a checklist. Most steps are automated by the configuration agent.
- OpenCivics team member supervises but intervenes less. Available for edge cases.
- Intake form captures enough information for the configuration agent to scaffold most of the node before the call.

**Stage 3: Self-Serve (Post 25+ nodes)**
- Web portal or conversational wizard handles end-to-end creation.
- Configuration agent runs autonomously. No human operator required.
- OpenCivics team available for support but not in the critical path.
- Manual onboarding still available for communities that prefer it.

The trigger for each transition is confidence, not calendar. We move to Stage 2 when the playbook handles 90% of cases without improvisation. We move to Stage 3 when the configuration agent handles 90% of cases without human intervention.

---

## 13. Technical Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Globe rendering | Three.js + custom WebGL shaders | Performant, supports custom geometry for choropleth and animated arcs |
| Bioregion tiles | Tippecanoe → vector tiles, MapLibre GL | Industry standard for large geospatial datasets |
| Frontend | Next.js (React) | SSR/SSG for performance, API routes, Vercel deployment |
| Agent runtime | **OpenClaw** (open-source agent runtime) | Proven runtime with multi-channel, memory, tool use, GitHub integration |
| Reasoning engine | Claude API via OpenClaw model config | Best-in-class reasoning, tool use, long-context (supports GPT, local models too) |
| Bioregional skills | **Skill pack** (vault-rag, federation, bridge-translator, github-steward, librarian) | Modular domain-specific tools installed into each OpenClaw instance |
| Vector store | Shared PostgreSQL + pgvector | Single database, per-node schemas for RAG embeddings |
| Shared server | **Coolify** (self-hosted PaaS) on Hetzner/OVH | Open-source, full control, dramatically lower cost than managed PaaS |
| Agent memory | OpenClaw workspace files (`memory/`, `MEMORY.md`) | Git-backed, no custom schema needed, simpler than PostgreSQL JSON |
| Agent persona | `SOUL.md` (OpenClaw pattern) | Agent reads persona each session — natural language, more maintainable than YAML |
| Process management | Coolify + Docker health checks | Container orchestration, auto-restart, SSL, per-agent domains |
| Schema bridges | YAML in GitHub | Version-controlled, PR-governed, human-readable, diffable |
| Bridge/node validation | JSON Schema + GitHub Actions | Automated CI on every PR |
| Node portal (future) | Next.js + GitHub OAuth | Shared framework with globe, native GitHub integration |
| CLI | Node.js (npm package) | Cross-platform, JS ecosystem alignment |
| CI/CD | GitHub Actions | Git-native, free for public repos |
| Registry | GitHub repo (JSON + YAML) | Version-controlled, PR-based governance, no database dependency |
| Interaction channels | OpenClaw native channels (Telegram, Discord, Web chat, API) | Multi-channel already built into runtime |

---

## 14. MVP Scope & Phasing

### 14.1 MVP Definition

The MVP is the smallest system that delivers the core experience: *arrive, explore, discover, create (with help), participate, federate.*

| Feature | Priority | Module | Phase |
|---------|----------|--------|-------|
| Globe with bioregion choropleth and node markers | P0 | Globe | 1 |
| Location sharing → bioregion zoom | P0 | Globe | 1 |
| Flow arcs (git forks/contributions) | P0 | Globe | 1 |
| Node Cards with identity, activity, participation blocks | P0 | Node Cards | 1 |
| Index registry with CI validation | P0 | Index Registry | 1 |
| Template repository | P0 | Index Registry | 1 |
| Permissionless manual registration (PR path) | P0 | Index Registry | 1 |
| 3–5 seed nodes (OpenCivics-operated) | P0 | — | 1 |
| Agent runtime with RAG, persistent memory, BYOK | P0 | Agent Runtime | 2 |
| Shared server with container-per-agent | P0 | Agent Runtime | 2 |
| Configuration agent for node scaffolding | P0 | Creation Engine | 2 |
| Manual onboarding flow (assisted mode) | P0 | Creation Engine | 2 |
| Embedded agent chat in Node Cards | P0 | Node Cards, Agent | 2 |
| Location tagging → bioregion auto-detection | P0 | Creation Engine | 2 |
| Progressive autonomy model (agent-led → collaboration) | P0 | Creation Engine | 2 |
| Interaction channel setup (web chat, Telegram) | P1 | Agent Runtime | 2 |
| Federation v1 (agent-to-agent query routing) | P0 | Federation | 3 |
| Local schema declaration (`schema.yaml`) | P0 | Schema Bridges | 3 |
| Schema bridge YAML format and lifecycle | P1 | Schema Bridges | 3 |
| Bridge-aware query translation in federation | P1 | Federation | 3 |
| Bridge visualization on globe | P1 | Globe | 3 |
| CLI tools | P1 | Creation Engine | 3 |
| Global federated search from globe | P1 | Globe, Federation | 3 |
| Bridge proposal tooling (CLI + agent-assisted) | P1 | Schema Bridges | 3 |
| Self-serve creation portal (conversational wizard) | P1 | Creation Engine | 4 |
| Filters and view modes on globe | P2 | Globe | 4 |
| Agent observability dashboard with API usage tracking | P2 | Agent Runtime | 4 |

### 14.2 Out of Scope (v1)

- Transitive bridging (A→B→C translation chains)
- Agent-to-agent query logs as flow visualization
- Automated bridge suggestion based on vault content similarity
- Governance tooling within nodes
- Real-time collaborative editing
- Mobile-native application
- Offline/local-first agent operation
- Non-GitHub git hosting support
- OpenCivics-subsidized AI compute (operators always BYOK)

### 14.3 Phased Roadmap

**Phase 1: The Globe & Registry (Months 1–3)**
- Globe renderer with bioregion choropleth, node markers, flow arcs
- Location sharing and bioregion zoom
- Index registry with CI validation and template repo
- Node Cards (static — no agent chat yet, but links to Quartz site and repo)
- 3–5 seed nodes manually created by OpenCivics team
- Permissionless PR registration path functional
- README and documentation for manual node creation

**Phase 2: Agents & Onboarding (Months 3–5)**
- Shared server infrastructure (container-per-agent, vector stores, memory)
- Agent runtime with Claude API, RAG, persistent memory, BYOK key management
- Configuration agent for node scaffolding
- Manual onboarding process: intake form → onboarding call → agent setup
- Embedded agent chat in Node Cards and Quartz sites
- Interaction channel setup (web chat default, Telegram optional)
- Progressive autonomy model active on seed nodes
- Onboard first 5–10 external community nodes manually

**Phase 3: Federation & Bridges (Months 5–7)**
- Federation v1 between nodes on the shared server
- Schema bridge YAML format finalized and documented
- 2–3 seed bridges manually authored between seed nodes
- Bridge-aware query translation in federation
- Bridge visualization on globe
- CLI tools (init, register, agent setup, bridge propose, status)
- Global federated search from globe
- Onboarding playbook hardened — begin transition to semi-automated

**Phase 4: Scale & Self-Serve (Months 7+)**
- Self-serve creation portal (conversational wizard)
- Configuration agent runs autonomously (no human operator)
- Automated bridge suggestion
- Agent observability dashboard with API usage tracking
- Transitive bridging
- Additional flow types
- Agent memory federation
- Bridge analytics
- Non-GitHub provider support
- Mobile optimization

### 14.4 Success Criteria

- **10+ active nodes** across 3+ bioregions within 90 days of Phase 2 launch.
- **5+ active bridges** with 20+ vocabulary terms each within 90 days of Phase 3 launch.
- **Node creation <45 min** via manual onboarding (assisted mode). Target <15 min in self-serve mode.
- **Federation functional:** Query to one agent routes to and returns results from a peer, with bridge translation.
- **Globe loads <3s** on broadband with full network rendered.
- **BYOK operational:** All node agents running on operator-provided API keys with no OpenCivics AI spend.
- **Progressive autonomy:** At least 3 creators transition from agent-led to collaboration mode within 60 days.
- **Permissionless path used:** At least 2 nodes registered via direct PR (no onboarding session) within 90 days.
- **Onboarding maturity:** Transition from Stage 1 to Stage 2 within 6 months.

---

## 15. Open Questions & Risks

### 15.1 Open Questions

| # | Question | Impact |
|---|----------|--------|
| 1 | **Shared server scaling:** At what node count does a single server become insufficient? When do we need horizontal scaling or regional distribution? | Infrastructure cost, latency |
| 2 | **Agent authentication for federation:** How do agents authenticate during cross-node queries? API keys? Mutual TLS? Signed messages? | Security, trust model |
| 3 | **Progressive autonomy signals:** How does the agent gauge when a creator is ready to transition phases? What if they never want to learn git? | UX, agent design |
| 4 | **Vault quality and moderation:** Is there a minimum bar for registration, or is the network fully permissionless? How are abandoned or malicious nodes handled? | Network integrity |
| 5 | **Bridge governance at scale:** Who arbitrates vocabulary disagreements between bridge partners? | Network cohesion |
| 6 | **Bridge bootstrapping:** How do we lower activation energy for the first bridge? Cold-start problem. | Adoption |
| 7 | **Quartz dependency:** Small maintainer team. Fallback if development stalls? | Long-term maintenance |
| 8 | **Agent-as-committer:** GitHub ToS implications of an AI agent making commits on behalf of a user? | Legal, platform risk |
| 9 | **BYOK friction:** Getting an Anthropic API key requires a credit card. This is a barrier for some communities. Subsidy model for under-resourced bioregions? | Equity, access |
| 10 | **Federation cost surprise:** A node could receive unexpected federation query volume, driving up the operator's API bill. Rate limiting? Cost caps? | Operator trust |

### 15.2 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GitHub API rate limits throttle flow data | High | Medium | Caching, GitHub App with higher limits, webhook-based updates |
| Low adoption — nodes registered but unmaintained | Medium | High | Seed network, activity indicators, dormancy detection, agent-driven engagement prompts |
| Agent hallucination — fabricated content | Medium | High | Strict RAG grounding, source citations, confidence thresholds |
| Creator never transitions from agent-led mode | Medium | Low | Agent-led is a valid permanent state. The agent stewards indefinitely if given direction. |
| Bridge maintenance burden — bridges go stale | High | Medium | Review schedule enforcement, CI alerts, staleness detection |
| BYOK barrier to entry | Medium | High | Clear documentation, guided key setup in onboarding, explore subsidy model for Phase 4 |
| Federation cost surprise for operators | Medium | Medium | Federation policy controls, rate limiting, cost alerts in dashboard, clear documentation |
| Shared server single point of failure | Medium | High | Self-hosting always available as fallback, node data lives in git (never lost), container orchestration with auto-restart |
| Scope creep from governance/identity/economic layers | High | Medium | Strict v1 scope boundary, modular architecture allows deferred integration |
| Translation loss — bridges miss cultural nuance | Medium | Medium | Preserve-original-term policy for untranslatable concepts, narrative context fields |
| Platform-as-dependency | Medium | High | Every platform action has a permissionless git equivalent. Communities can always fall back to git. |
| Manual onboarding doesn't scale | High | Medium | This is expected. Manual is Phase 1. Standardize into automation before scaling outreach. Don't onboard faster than the playbook can handle. |

---

## 16. Appendices

### Appendix A: Complete Schema Bridge Example

```yaml
# Schema Bridge: Front Range Watershed Commons ↔ Sierra Nevada Water Systems
bridge_id: "NA19-watershed_NA15-water"
version: "1.0.0"
last_updated: "2026-02-10"

nodes:
  source:
    node_id: "uuid-na19-watershed"
    display_name: "Front Range Watershed Commons"
    schema_version: "1.0.0"
  target:
    node_id: "uuid-na15-water"
    display_name: "Sierra Nevada Water Systems Hub"
    schema_version: "2.1.0"

vocabulary:
  - source_term: "watershed governance"
    target_term: "water systems stewardship"
    confidence: 1.0
    notes: "Both refer to community decision-making about water resources"

  - source_term: "riparian buffer"
    target_term: "streamside management zone"
    confidence: 0.9
    notes: "Near-synonyms; SMZ is broader, may include upland areas"

  - source_term: "acequia"
    target_term: null
    confidence: 0.0
    notes: "No equivalent — culturally specific irrigation system. Preserve original term."

  - source_term: "base flow"
    target_term: "minimum instream flow"
    confidence: 0.7
    notes: "Related but distinct — base flow is hydrological, minimum instream flow is regulatory"

structure:
  - source_path: "/governance/water-rights"
    target_path: "/stewardship/allocation-frameworks"
  - source_path: "/ecology/stream-health"
    target_path: "/monitoring/aquatic-indicators"
  - source_path: "/practice/irrigation"
    target_path: "/operations/distribution"

taxonomies:
  - name: "water-body-classification"
    mapping:
      "perennial stream": "year-round waterway"
      "intermittent stream": "seasonal waterway"
      "ephemeral wash": "storm-dependent channel"
      "spring": "groundwater emergence"
      "wetland": "saturated land"

query_translation:
  - source_pattern: "water rights in {location}"
    target_pattern: "allocation frameworks for {location}"
  - source_pattern: "stream health indicators"
    target_pattern: "aquatic monitoring indicators"

bidirectional: true

maintainers:
  - github: "user-a"
  - github: "user-b"
review_schedule: "quarterly"
```

### Appendix B: Local Schema Declaration Example

```yaml
# schema.yaml — declares this node's vocabulary for bridge authors
schema_version: "1.0.0"
node_id: "uuid-na19-watershed"

vocabulary:
  - term: "watershed governance"
    definition: "Community decision-making processes for shared water resources"
    synonyms: ["water governance", "watershed management"]
  - term: "riparian buffer"
    definition: "Vegetated area adjacent to a stream that filters runoff and stabilizes banks"
  - term: "acequia"
    definition: "Community-managed irrigation ditch system from Spanish and Indigenous traditions in the American Southwest"

directory_semantics:
  "/governance/water-rights": "Legal and customary frameworks for water allocation"
  "/ecology/stream-health": "Biological and chemical indicators of stream ecosystem health"
  "/practice/irrigation": "Operational guides for water distribution and irrigation systems"

taxonomies:
  - name: "water-body-classification"
    categories: ["perennial stream", "intermittent stream", "ephemeral wash", "spring", "wetland"]
```

### Appendix C: One Earth Bioregion Coverage

| Realm | Prefix | Count | Example |
|-------|--------|-------|---------|
| Nearctic | NA | 31 | NA19 — Colorado Plateau & Mountain Forests |
| Palearctic | PA | 53 | PA09 — English Lowlands & Welsh Borders |
| Neotropic | NT | 29 | NT14 — Serra do Mar & Atlantic Forests |
| Afrotropic | AT | 24 | AT11 — East African Montane & Coastal Forests |
| Indomalayan | IM | 18 | IM06 — Western Ghats & Sri Lankan Rainforests |
| Australasia | AU | 16 | AU03 — Southeast Australian Temperate Forests |
| Oceanian | OC | 11 | OC03 — Polynesian-Micronesian Tropical Islands |
| Antarctic | AN | 3 | AN01 — Antarctic Peninsula & Scotia Sea |

### Appendix D: Related Assets

- **one_earth-bioregions-2023-enriched.geojson:** Full-resolution enriched GeoJSON, 185 bioregions, 21.4 MB.
- **bioregion-lookup.json:** Lightweight lookup table (48 KB) keyed by bioregion code.
- **One Earth Bioregion Navigator:** https://www.oneearth.org/bioregions/

### Appendix E: Onboarding Session Template

Checklist for OpenCivics team member conducting a manual onboarding session:

**Pre-call:**
- [ ] Review intake form: name, location, thematic focus, community context
- [ ] Check if bioregion has existing nodes (potential bridge partners)
- [ ] Prepare template repo fork link

**During call:**
- [ ] Confirm bioregion tagging via map
- [ ] Gather commons definition: name, domain, description, 3–5 key topics, local vocabulary
- [ ] GitHub account setup (if needed)
- [ ] Fork template repo into creator's account
- [ ] Run configuration agent: scaffold `schema.yaml`, `agent.config.yaml`, initial pages
- [ ] Walk creator through obtaining a Claude API key from Anthropic console
- [ ] Configure agent on shared server with creator's API key
- [ ] Set up interaction channels (web chat + optional Telegram)
- [ ] Submit registry PR
- [ ] Verify node appears on globe after PR merge

**Post-call:**
- [ ] Send creator summary with all links (repo, Quartz site, agent chat, Telegram bot)
- [ ] Schedule Week 1 check-in
- [ ] Document any friction points or gaps in the playbook
- [ ] Log session in onboarding tracker

---

*— End of Document —*