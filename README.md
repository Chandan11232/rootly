# Rootly

AI-powered incident root cause analysis for modern infrastructure. Drop raw logs from any service, and Rootly instantly identifies what went wrong, why it happened, what's affected, and exactly how to fix it — so your team resolves incidents in minutes, not hours.

> Built for **The Zerops Challenge** by WeMakeDevs — August 8–9, 2026.

## Live Demo

> **URL:** [https://rootly.zerops.app](https://rootly.zerops.app)

## Table of Contents

- [The Problem](#the-problem)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [How Zerops Is Used](#how-zerops-is-used)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Local Development](#local-development)
- [Deployment to Zerops](#deployment-to-zerops)
- [AI Analysis Pipeline](#ai-analysis-pipeline)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)

---

## The Problem

When production incidents strike, on-call engineers waste precious minutes reading through thousands of lines of logs, grepping for error patterns, and manually correlating symptoms across services. During a P1 outage at 3 AM, every minute ofMTTR (Mean Time To Resolution) costs real money and real user trust.

Rootly eliminates this bottleneck. Drop your raw logs — Kubernetes events, application traces, database errors, whatever — and an LLM-powered analysis pipeline returns a structured root cause report in seconds: what went wrong, why it went wrong, what's affected, and exactly what to do about it.

## How It Works

```
1. Paste logs          →  Submit via dashboard
2. Queue for analysis  →  NATS JetStream buffers the request
3. AI processes logs   →  LLaMA 3.3 70B via Groq (or local Ollama fallback)
4. Structured output   →  Root cause, severity, symptoms, actions
5. View results        →  Real-time polling updates the dashboard
```

No account creation. No config. Just logs in, answers out.

## Architecture

```
┌──────────────────┐
│                  │
│    Frontend      │  React 19 + Vite 6 SPA
│    (Port 5173)   │  Dark-themed dashboard, incident submission,
│                  │  real-time status polling
└────────┬─────────┘
         │ REST API (proxied via Vite dev / production URL)
         ▼
┌──────────────────┐        ┌─────────────────┐
│                  │  NATS  │                 │
│    API Server    │───────▶│  NATS JetStream │
│    Express.js    │        │  Message Queue  │
│    (Port 3001)   │        └────────┬────────┘
│                  │                 │
└────────┬─────────┘                 ▼
         │                  ┌─────────────────┐
         │                  │    Worker       │
         │                  │    Node.js      │
         │                  │    AI Analysis  │
         │                  └────────┬────────┘
         │                           │
         ▼                           ▼
┌──────────────────────────────────────────┐
│              PostgreSQL 16               │
│   incidents table (JSONB analysis)       │
└──────────────────────────────────────────┘
```

### Service Breakdown

| Service | Role | Why This Tech |
|---------|------|---------------|
| **Frontend** | SPA dashboard for log submission and result viewing | React 19 + Vite 6 — fast HMR, TypeScript-native, lightweight |
| **API** | REST endpoints for incident CRUD, stats, health checks | Express.js — battle-tested, minimal boilerplate for REST |
| **Worker** | Background AI analysis processor | Node.js — same runtime as API, shares types via `/shared` |
| **NATS** | Async message queue between API and Worker | JetStream provides durable delivery, backpressure, and at-least-once processing |
| **PostgreSQL** | Persistent storage for incidents and analysis results | JSONB column stores the full structured AI output without schema rigidity |

---

## How Zerops Is Used

Zerops is the **entire production infrastructure** for this project. It is not a bolt-on — every service runs on Zerops managed runtimes and databases.

### What Runs on Zerops

| Zerops Service | Stack | Purpose |
|----------------|-------|---------|
| `api` | Node.js 22 runtime | Express API server |
| `worker` | Node.js 22 runtime | AI analysis background worker |
| `frontend` | Node.js 22 (static serve) | React SPA served via `npx serve` |
| `postgres` | PostgreSQL 16 (managed) | Persistent database with auto-backups |
| `nats` | NATS (managed) | JetStream message queue |

### Zerops-Specific Features Used

- **Managed PostgreSQL** — No Docker, no connection pooling setup, automatic failover and backups handled by Zerops. The API connects via `postgres://postgres:${postgres.password}@postgres:5432/incident_analyzer` using Zerops internal DNS.
- **Managed NATS** — Zero-config NATS with JetStream enabled. The `nats://nats:4222` internal URL means services communicate over Zerops private networking with no public exposure.
- **Private Networking** — All five services communicate over Zerops internal network. PostgreSQL and NATS are never exposed to the public internet. Only the frontend has `httpSupport: true`.
- **Environment Variables & Secrets** — `GROQ_API_KEY` and database passwords are injected via Zerops environment variables, never committed to source.
- **Automated Build Pipeline** — The `zerops.yml` declaratively defines build commands, run commands, port mappings, and service dependencies. One `zcli push` deploys everything.
- **Horizontal Scaling Ready** — Each service has `minContainers: 1` but can be scaled horizontally via Zerops dashboard or CLI without code changes.

### Architecture Diagram (Zerops View)

```
                    PUBLIC TRAFFIC
                         │
                         ▼
               ┌─────────────────┐
               │    Frontend     │  ← Zerops Node.js runtime
               │   (httpSupport) │     Static React build
               └────────┬────────┘
                        │ internal network
                        ▼
               ┌─────────────────┐
               │    API Server   │  ← Zerops Node.js runtime
               │   (Port 3001)  │     REST endpoints
               └───┬─────────┬───┘
                   │         │
          ┌────────┘         └────────┐
          ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│   NATS (JetStream)│      │   PostgreSQL 16  │  ← Zerops managed
│  Private network  │      │  Private network │     databases
└────────┬─────────┘      └──────────────────┘
         │
         ▼
┌──────────────────┐
│     Worker       │  ← Zerops Node.js runtime
│  AI Analysis     │     Background processor
└──────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend | React | 19.x | Component-based SPA |
| Build Tool | Vite | 6.x | Fast bundling, HMR, proxy config |
| Routing | React Router DOM | 7.x | Client-side routing |
| API | Express.js | 4.21.x | REST API framework |
| Language | TypeScript | 5.6.x | Type safety across all services |
| Database | PostgreSQL | 16 | JSONB storage for flexible analysis data |
| Message Queue | NATS + JetStream | 2.29.x | Durable async processing |
| AI (Primary) | Groq API | LLaMA 3.3 70B | Free-tier, fast inference |
| AI (Fallback) | Ollama | LLaMA 3.1 8B | Local fallback for offline use |
| Deployment | Zerops | — | Full infrastructure platform |

---

## Features

### Core Functionality
- **AI-powered root cause analysis** — LLM reads raw logs and extracts structured incident data
- **Dual AI provider** — Groq (cloud, free, fast) with Ollama (local) fallback
- **Async processing** — NATS JetStream queues incidents so the UI is never blocked
- **Structured output** — Root cause, confidence score, severity, symptoms, affected services, suggested actions, runbook links, contributing factors

### Incident Management
- **Submit incidents** — Paste any logs with title, service name, and environment
- **Dashboard** — Real-time stats (total, critical, analyzing, resolved) and incident list
- **Detail view** — Full AI analysis with visual confidence bar, severity badge, actionable steps
- **Sample data** — Built-in sample logs for instant testing

### Engineering Quality
- **Type-safe** — TypeScript across all three services with shared type definitions
- **Polling-based real-time** — Dashboard (3s), detail (2s), submit (1s) auto-refresh
- **Health monitoring** — `/api/health` endpoint for uptime checks
- **Responsive dark UI** — Custom CSS with animated background, no UI framework dependency

---

## Local Development

### Prerequisites
- Node.js 20+
- Docker (for PostgreSQL and NATS)
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Configure environment
cp .env.example .env
# Edit .env — set GROQ_API_KEY at minimum

# 3. Start infrastructure
docker run -d --name pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres postgres:16

docker run -d --name nats -p 4222:4222 nats

# 4. Start all services
npm run dev
```

Visit `http://localhost:5173`

### Individual Services

```bash
# Run only the API
cd api && npm run dev

# Run only the worker
cd worker && npm run dev

# Run only the frontend
cd frontend && npm run dev
```

---

## Deployment to Zerops

### Prerequisites
1. Create a free Zerops account at [zerops.io](https://zerops.io) ($15 in free credits)
2. Install Zerops CLI: `npm i -g zcli`
3. Login: `zcli login`

### Deploy

```bash
zcli push
```

The `zerops.yml` at the project root defines all five services. Zerops will:
1. Build each service with the specified build commands
2. Deploy them with correct port mappings and environment variables
3. Wire up internal networking between services
4. Start all services and verify health

### Environment Variables on Zerops

Set these via the Zerops dashboard or CLI:

| Variable | Where | Description |
|----------|-------|-------------|
| `GROQ_API_KEY` | api, worker | Groq API key for AI analysis |
| `DATABASE_URL` | api, worker | Auto-generated by Zerops PostgreSQL |
| `NATS_URL` | api, worker | Auto-generated by Zerops NATS |

### Verify Deployment

```bash
# Check API health
curl https://YOUR_PROJECT.zerops.app/api/health

# Check frontend
open https://YOUR_PROJECT.zerops.app
```

---

## AI Analysis Pipeline

### How the Analysis Works

1. **Log Ingestion** — User submits raw logs via the frontend form
2. **Queue Publishing** — API publishes the incident to NATS subject `incidents.analyze`
3. **Worker Consumption** — Worker subscribes to the NATS stream
4. **AI Call** — Worker sends logs to Groq API (or Ollama fallback) with a structured prompt
5. **Response Parsing** — AI returns JSON with: summary, root_cause, confidence, severity, symptoms, affected_services, suggested_actions, runbook_links, contributing_factors
6. **Database Update** — Worker writes the analysis back to PostgreSQL as JSONB
7. **Frontend Polling** — Dashboard polls every 2-3 seconds, shows live status

### AI Prompt Engineering

The system prompt instructs the model to act as an expert SRE and return strictly structured JSON. Key design decisions:
- **Temperature 0.3** — Low creativity, high factual accuracy
- **JSON mode** — `response_format: { type: 'json_object' }` ensures parseable output
- **Confidence scoring** — Model self-assesses analysis reliability (0-1)
- **Severity classification** — Automatic critical/high/medium/low ranking

### Fallback Strategy

```
Groq (cloud, free) ──→ If key exists and API responds
       │
       ▼ (on failure)
Ollama (local) ──→ If Groq fails or no key
       │
       ▼ (on failure)
Mark incident as "failed" in database
```

This ensures the system works both online (Groq free tier) and offline (local Ollama).

---

## Database Schema

Single `incidents` table — simple, effective, JSONB-powered.

```sql
CREATE TABLE incidents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  raw_logs      TEXT NOT NULL,
  service       TEXT,
  environment   TEXT,
  severity      TEXT DEFAULT 'info',
  status        TEXT DEFAULT 'open',
  analysis      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX idx_incidents_service ON incidents(service);
```

### Why JSONB for Analysis?

The AI returns a complex nested structure (arrays, objects, numbers). Rather than creating separate tables for symptoms, actions, etc., JSONB lets us:
- Store the full analysis atomically
- Query with PostgreSQL JSON operators
- Evolve the analysis schema without migrations
- Keep the codebase simple

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `NATS_URL` | Yes | — | NATS server URL |
| `GROQ_API_KEY` | No* | — | Groq API key (free tier) |
| `OLLAMA_URL` | No | `http://localhost:11434` | Ollama server URL |
| `PORT` | No | `3001` | API server port |

*Without `GROQ_API_KEY`, the system falls back to Ollama (must be running locally).

---

## Project Structure

```
rootly/
├── api/                    # Express.js REST API
│   └── src/
│       ├── index.ts        # Server entry point
│       ├── db.ts           # PostgreSQL queries & schema init
│       ├── nats.ts         # NATS JetStream connection
│       └── routes.ts       # API route handlers
├── worker/                 # Background AI processor
│   └── src/
│       ├── index.ts        # Worker entry point (NATS subscriber)
│       ├── analyzer.ts     # Groq/Ollama AI calls
│       └── db.ts           # Database update operations
├── frontend/               # React SPA
│   └── src/
│       ├── App.tsx         # Router setup
│       ├── AppLayout.tsx   # Sidebar layout
│       ├── api.ts          # API client
│       └── pages/
│           ├── Landing.tsx         # Marketing landing page
│           ├── AppDashboard.tsx    # Stats + incident list
│           ├── SubmitIncident.tsx  # Log submission form
│           └── IncidentDetail.tsx  # Full analysis view
├── shared/                 # Shared types
│   ├── types.d.ts          # TypeScript definitions
│   └── types.js            # JavaScript constants
├── zerops.yml              # Zerops deployment config
├── .env.example            # Environment template
└── package.json            # Root orchestrator
```

---

## The Zerops Challenge

This project was built for **The Zerops Challenge** by WeMakeDevs (August 8–9, 2026).

### How It Meets the Requirements

| Requirement | How Rootly Fulfills It |
|-------------|---------------------------|
| Solo project | Built by one developer |
| Deployed on Zerops | All 5 services on Zerops (API, Worker, Frontend, PostgreSQL, NATS) |
| Zerops meaningfully used | Managed databases, message queue, private networking, build pipeline — not just hosting |
| Complex architecture | Frontend + API + Worker + Database + Message Queue (5 services) |
| Live and reachable | Deployed at a public Zerops URL |
| Source code available | Public repository |
| Demo video | Short video showing log submission → AI analysis → result viewing |

### Judging Alignment

**Idea** — Solves a real problem (incident response is slow and error-prone when done manually)

**Execution** — Production-grade architecture with async processing, structured AI output, and proper error handling

**Zerops Usage** — Five distinct Zerops services communicating over private networking, managed databases, and automated build pipeline via `zerops.yml`

---

## License

MIT
