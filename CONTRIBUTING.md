# Contributing to GitHub Command Center

Thank you for your interest in contributing to **GitHub Command Center**!

## Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vjymisal0/github-command-center.git
   cd github-command-center
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.example .env
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Start Local Dependencies (PostgreSQL + Redis)**:
   ```bash
   docker compose up -d postgres redis
   ```

5. **Generate Database Client**:
   ```bash
   npm run db:generate
   ```

6. **Start Applications**:
   ```bash
   # In terminal 1 (API):
   npm run dev -w apps/api

   # In terminal 2 (Web UI):
   npm run dev -w apps/web

   # In terminal 3 (Sync Worker):
   npm run dev -w apps/worker
   ```

## Code Guidelines

- **Zero Animations Policy**: To maintain crisp developer ergonomics, the web UI uses purely static CSS with zero transitions or animations.
- **Explainable Classification Rules**: All action rules reside in `packages/shared/src/action-rules.ts` and must have 100% deterministic unit test coverage in `packages/shared/src/action-rules.test.ts`.
- **Credential Security**: Tokens are strictly server-side and encrypted with AES-256-GCM. Never log or transmit raw tokens to the browser.
- **Read-Only GitHub Access**: v1 is strictly read-only (no merge buttons, comments, or repository writes).

## Running Tests

```bash
npm test
npm run typecheck
```
