# OSS Tracker

A self-hosted, read-only GitHub command center for repositories, pull requests, reviews, checks, and contribution activity.

## Features

- GitHub OAuth sign-in and fine-grained PAT fallback
- User-scoped repository and pull-request discovery
- Explainable action inbox
- Read-only PR and repository explorers
- Light and dark themes
- Docker Compose deployment with PostgreSQL, Redis, API, web, and worker services
- Vercel/Netlify web deployment with bundled API routes
- GitHub webhook endpoint and scheduled sync foundation

## Local development

### Full stack with Docker (recommended)

```bash
cp .env.example .env
# Set CREDENTIAL_ENCRYPTION_KEY to 64 hex characters:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
docker compose up --build
```

Open `http://localhost:3100`. The first registered account becomes the initial operator account. Keep `ALLOW_REGISTRATION=false` unless additional account creation is intentionally enabled.

### Run application processes on the host

```bash
npm install
npm run db:generate
docker compose up -d postgres redis
npm run db:migrate
npm run dev
```

The host-mode web app runs on `http://localhost:3000`; the API runs on `http://localhost:4000`.

## Production deployment

### Docker/VM

```bash
cp .env.example .env
# Set strong secrets and public URLs in .env
docker compose up -d --build
```

Put Caddy, Nginx, or another HTTPS reverse proxy in front of the web service. Keep PostgreSQL and Redis private.

### Vercel or Netlify

Deploy the repo root. The Next.js app in `apps/web` also serves the API at `/api/*`, so no separate Fastify server is required.

Set these environment variables on the platform:

```text
DATABASE_URL=postgresql://...
PUBLIC_WEB_URL=https://your-domain.example
GITHUB_OAUTH_CALLBACK_URL=https://your-domain.example/api/auth/github/callback
SESSION_SECRET=...
CREDENTIAL_ENCRYPTION_KEY=<64 hex characters>
ALLOW_REGISTRATION=false
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

Run `npm run db:migrate` against the production database before the first deploy and after schema changes. Use hosted Postgres; serverless platforms do not run the bundled Docker PostgreSQL/Redis services.

The API applies Prisma migrations in Docker only. Back up PostgreSQL before upgrades. A lost credential-encryption key cannot be recovered; rotate it only with a deliberate credential reconnection or re-encryption procedure.

## Scope

OSS Tracker is intentionally read-only in v1. It does not merge pull requests, comment, edit repositories, browse source code, or rerun workflows.

## Contributing

Issues and pull requests are welcome. Keep changes focused, protect user isolation, and never commit credentials or private GitHub data.

## License

MIT. See [LICENSE](LICENSE).
