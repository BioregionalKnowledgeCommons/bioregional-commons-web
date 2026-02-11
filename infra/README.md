# Bioregional Knowledge Commons Infrastructure

This directory contains infrastructure configuration for the OpenClaw + Coolify deployment.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     COOLIFY PaaS (Self-Hosted)                          │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   OpenClaw Instances                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │  │
│  │  │  Node Agent   │  │  Node Agent   │  │  Config Agent │         │  │
│  │  │  SOUL.md      │  │  SOUL.md      │  │  SOUL.md      │         │  │
│  │  │  skills/      │  │  skills/      │  │  skills/      │         │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │  │
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

## Server Requirements

**Minimum:** Hetzner CX42 (8 vCPU, 16 GB RAM, 160 GB disk) - ~€17/month
- Can run ~20 OpenClaw agent instances + PostgreSQL

**Recommended for production:** Hetzner CCX33 or equivalent
- 16 vCPU, 32 GB RAM for 50+ agents

## Setup Instructions

### 1. Provision Server

```bash
# Using Hetzner CLI (or web console)
hcloud server create --name opencivics-agents \
  --type cx42 \
  --image ubuntu-22.04 \
  --ssh-key your-ssh-key \
  --location nbg1
```

### 2. Install Coolify

```bash
# SSH into server
ssh root@your-server-ip

# Install Coolify (one-liner)
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

### 3. Configure Coolify

1. Access Coolify at `http://your-server-ip:8000`
2. Complete initial setup wizard
3. Add your domain (e.g., `agents.opencivics.org`)
4. Configure SSL via Let's Encrypt

### 4. Deploy PostgreSQL + pgvector

Use the `docker-compose.postgres.yml` in this directory or deploy via Coolify UI.

### 5. Deploy Config Agent

See `config-agent/` directory for the meta-agent that deploys other agents.

## Files in this Directory

- `docker-compose.postgres.yml` - PostgreSQL + pgvector configuration
- `docker-compose.dev.yml` - Local development stack
- `coolify-service-template.json` - Template for deploying new agents via Coolify API
- `config-agent/` - The meta-agent that deploys and manages node agents
- `nginx-proxy.conf` - Backup proxy configuration (Coolify handles this automatically)

## Environment Variables

Each agent needs:

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Operator's Claude API key | Yes |
| `GITHUB_REPO` | Vault repository URL | Yes |
| `NODE_ID` | Unique node identifier | Yes |
| `PGVECTOR_URL` | PostgreSQL connection string | Yes |
| `TELEGRAM_TOKEN` | Telegram bot token | Optional |
| `DISCORD_TOKEN` | Discord bot token | Optional |
| `FEDERATION_ENABLED` | Enable federation queries | Optional |

## Monitoring

Coolify provides built-in monitoring:
- Container health checks
- Resource usage (CPU, memory, disk)
- Log aggregation

For production, consider adding:
- Sentry for error tracking
- Grafana + Prometheus for metrics
