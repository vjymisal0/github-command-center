# GitHub Command Center

Open-source, self-hosted GitHub dashboard with a read-only action inbox.

## Status

Phase 1 foundation is in progress: monorepo, UI shell, API health endpoint, worker stub, Postgres/Redis compose, and initial Prisma schema.

## Development

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run db:generate
npm run dev
```

## Apps

- `apps/web` — Next.js UI shell
- `apps/api` — authenticated API surface, starting with `/health` and `/sync/status`
- `apps/worker` — BullMQ worker for GitHub sync jobs
- `packages/database` — Prisma schema
- `packages/shared` — shared deterministic rules

## v1 constraint

Read-only GitHub data. No PR merges, comments, edits, or workflow reruns.
