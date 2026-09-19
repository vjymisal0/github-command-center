# GitHub Command Center

> Open-source, self-hosted developer command center with an explainable, read-only Action Inbox.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Node](https://img.shields.io/badge/Node-22%2B-green)

---

## Features

- **Action Inbox**: Deterministic rule classification highlighting PRs that require your attention (`REVIEW_REQUESTED`, `CHANGES_REQUESTED`, `CI_FAILED`, `WAITING_FOR_REVIEW`, `READY_TO_MERGE_CANDIDATE`).
- **PR Explorer**: Searchable, filterable drill-down across open, draft, and reviewed pull requests.
- **Repository Explorer**: Discovers and classifies repositories across multiple connected GitHub accounts (`Owned` vs `Collaborating`, `Public` vs `Private`).
- **Zero Animations & High-Density UI**: Fast, distraction-free developer dashboard aesthetic without sluggish transitions or animations.
- **Multi-Account Support**: Connect multiple GitHub accounts via fine-grained Personal Access Tokens (PAT).
- **AES-256-GCM Credential Encryption**: Tokens are encrypted server-side with unique nonces and auth tags before storage.
- **Read-Only Guarantee**: Strictly read-only in v1. No destructive merge buttons, comments, or workflow runs.

---

## Quick Start with Docker Compose

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vjymisal0/github-command-center.git
   cd github-command-center
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Update SESSION_SECRET and CREDENTIAL_ENCRYPTION_KEY in .env
   ```

3. **Start services**:
   ```bash
   docker compose up -d
   ```

4. **Access the application**:
   - Web UI: [http://localhost:3000](http://localhost:3000)
   - API: [http://localhost:4000](http://localhost:4000)

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL & Redis
docker compose up -d postgres redis

# 3. Generate Prisma client
npm run db:generate

# 4. Run tests & typecheck
npm test
npm run typecheck

# 5. Start development servers
npm run dev -w apps/api
npm run dev -w apps/web
npm run dev -w apps/worker
```

---

## Architecture

```text
Browser (Next.js UI - Port 3000)
        │
Fastify API (Port 4000) ────────────── PostgreSQL (Tenant Data & Encrypted Tokens)
        │                                  │
        ├── GitHub Connection Service      ├── AES-256-GCM Credential Store
        ├── Deterministic Rule Classifier  ├── User Repository Access
        └── Webhook Signature Ingress      └── Pull Requests & Action Items
        │
      BullMQ ─── Redis ─── Worker ─── GitHub REST/GraphQL API
```

---

## License

[MIT License](./LICENSE) © 2026 Vijay Misal
