# OSS Tracker

A self-hosted, read-only GitHub command center for repositories, pull requests, reviews, checks, and contribution activity.

## Features

- GitHub OAuth sign-in and fine-grained PAT fallback
- User-scoped repository and pull-request discovery
- Explainable action inbox
- Read-only PR and repository explorers
- Light and dark themes
- Docker Compose deployment with PostgreSQL, Redis, API, web, and worker services
- GitHub webhook endpoint and scheduled sync foundation

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

Web runs on `http://localhost:3000`; API runs on `http://localhost:4000`.

## Production deployment

```bash
cp .env.example .env
# Set strong secrets and public URLs in .env
docker compose up -d --build
```

Put Caddy, Nginx, or another HTTPS reverse proxy in front of web and API. Keep PostgreSQL and Redis private. For OAuth, configure the GitHub OAuth App callback as:

```text
https://your-domain.example/auth/github/callback
```

Required production variables include `PUBLIC_WEB_URL`, `PUBLIC_API_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_OAUTH_CALLBACK_URL`, `SESSION_SECRET`, and `CREDENTIAL_ENCRYPTION_KEY`.

## Scope

OSS Tracker is intentionally read-only in v1. It does not merge pull requests, comment, edit repositories, browse source code, or rerun workflows.

## Contributing

Issues and pull requests are welcome. Keep changes focused, protect user isolation, and never commit credentials or private GitHub data.

## License

MIT. See [LICENSE](LICENSE).
