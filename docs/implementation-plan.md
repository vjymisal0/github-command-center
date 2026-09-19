# GitHub Command Center — Implementation Plan

**Status:** Planning draft · **Product:** Open-source, multi-user, self-hosted GitHub dashboard · **Deployment target:** Docker Compose on a personal VM/VPS

## 1. Product definition

A read-only, personalized GitHub control center that consolidates repositories, pull requests, reviews, checks, and contribution history across each user's authorized GitHub resources. The differentiator is an **Action Inbox** backed by explainable rules, alongside an analytics-first overview and complete, searchable drill-down pages.

### Supported repository relationships
- **Owned:** Repositories owned by the connected GitHub user.
- **Collaborating:** Repositories the user can access but does not own.
- **External contributions:** Public repositories in which the user authored PRs, even without collaborator access.
- **Visibility:** Public/private is an independent attribute, not an exclusive repository category.

Do not assume one connection grants access to all repositories. Show only repositories and details authorized for the current user; label inaccessible, revoked, or partially synced data clearly.

## 2. Agreed UI specification

**Direction:** Vercel-inspired Developer Analytics Dashboard; comfortable information density; light/dark themes with system preference; minimal top navigation, no permanent sidebar.

**Top navigation:** Overview · Inbox · Pull Requests · Repositories · Activity. Profile menu: connections, settings, theme, account, instance administration (authorized admins only). Global search/command palette: `Ctrl+K` / `⌘K`.

**Overview:** Clickable cards for current open PRs, actionable items, failing checks, and merged PRs; opened/merged trend chart; public/private repository distribution; attention preview; last successful sync and freshness indicator. Date range applies to historical metrics, not current-state counts.

**Inbox:** Group/filter by review requested, changes requested, failing CI, unresolved conversations, ready-to-merge candidate, and waiting for others. A PR may have multiple action reasons. Every item links to the canonical PR detail page. Distinguish verified facts from inferred suggestions.

**PR explorer:** Full-page views for open, draft, merged, closed, failing CI, review requested, changes requested, and ready-to-merge candidates. Search, filters (repository, author, role, visibility, review/CI status, date), sorting, pagination, URL-persisted filters, and accurate result counts. Never claim a PR is definitively mergeable based solely on green checks: branch protections, merge conflicts, permissions, and other conditions may apply.

**PR detail:** Title, repository, author, branches, timestamps, state, description, reviews, requested reviewers, checks, relevant discussion/activity, and direct GitHub links. Read-only in v1; no merging, commenting, editing, or workflow reruns.

**Repositories:** Complete accessible-repository explorer; filters for owned/collaborating/external contribution and independently public/private. Repository detail: metadata, relationship, relevant PRs, activity, and accessible CI summary. For large external OSS repos, default to the user's contributions rather than all repo PRs.

**Activity:** Timeline and historical contribution metrics; show provenance and date scope.

**Responsive:** Desktop full nav + tables; tablet condensed nav; mobile navigation drawer + PR cards. Provide loading, empty, stale-data, rate-limited, partial-permission, expired-token, and first-sync states. Accessibility: keyboard navigation, focus visibility, semantic controls, contrast, non-color-only statuses.

### Typography decision (pending visual comparison)
- **Primary candidate:** Geist Sans; **technical text:** Geist Mono for hashes, branches, IDs, and command snippets.
- **Alternatives:** Inter (neutral/readable), IBM Plex Sans (technical personality).
- Suggested sizes: page title 24–28px; body 16px; PR rows 14px; metadata 12–13px; dashboard headline metrics 32px. Use tabular numerals for counts and metrics. Bundle permitted font assets or use system fallbacks; avoid unnecessary external font requests in self-hosted/private installations.
- Theme tokens: dark background `#09090B`, card `#18181B`; light background `#FAFAFA`, card `#FFFFFF`; restrained status colors. Branding/accent and logo remain open decisions.

## 3. Product scope and non-goals

### v1 capabilities
1. Instance setup, multi-user authentication, user-specific GitHub connections and repository authorization.
2. GitHub App integration plus fine-grained PAT fallback.
3. Repository discovery/classification and public/private explorer.
4. PR sync, review/check aggregation, searchable full-page PR lists and detail views.
5. Rule-based Action Inbox and dashboard analytics.
6. GitHub App webhook ingestion plus scheduled reconciliation; PAT scheduled sync.
7. Docker Compose deployment, configuration, backup/restore instructions, operational health checks, security documentation.

### Out of scope for v1
PR writes/merges/comments; code browsing; full GitHub issue management; AI summaries; Slack/email integrations; mobile native apps; advanced customizable widget layout; organization-wide analytics across users without explicit authorization.

## 4. Architecture

```text
Browser (Next.js UI)
        |
Authenticated NestJS API ───────────── PostgreSQL (tenant-scoped data)
        |                                  |
        +── GitHub connection service      +── encrypted PAT blobs
        +── PR/action classification       +── sync state + event history
        +── search/analytics endpoints
        +── webhook verification/ingress
        |
      BullMQ ─── Redis ─── Workers ─── GitHub REST/GraphQL APIs
                              ^
                      GitHub App webhooks
```

**Suggested stack:** Next.js + TypeScript + Tailwind/shadcn/ui; NestJS + TypeScript; PostgreSQL + Prisma; Redis + BullMQ; Octokit; Docker Compose; Caddy or existing reverse proxy. Keep API and worker independently runnable. Prefer one monorepo with `apps/web`, `apps/api`, `apps/worker`, `packages/database`, `packages/github`, `packages/shared`, `packages/ui`.

**Self-hosted installation:** Document environment variables, migrations, initial admin creation, app/PAT setup, reverse-proxy TLS, backup/restore, upgrades, and secrets rotation. Support both public HTTPS webhook deployment and PAT-only instances that do not expose a webhook endpoint.

## 5. Identity, GitHub connections, and authorization

**Application login is distinct from GitHub data access.** Implement local accounts and secure sessions for instance users; GitHub App user authorization may be added where required to reliably identify the current GitHub user and access user-specific resources. Do not confuse an installation access token (installation/repository context) with a user access token (user identity and user-scoped actions). Design and validate the exact GitHub App authorization flow before coding.

**GitHub App:** Prefer as the primary connection. Installation is limited to user-selected repositories and configured permissions; use short-lived installation tokens for permitted installation resources. Use user authorization/user tokens where user-specific identity or permissions are required. Some external contribution discovery may require user-authorized queries or public search beyond the installation's selected repos. Surface unsupported coverage rather than silently omitting results.

**Fine-grained PAT:** Alternative for users who cannot install the app. Show a permission checklist and repository coverage test. Exact endpoint permissions must be verified during implementation; PRs, checks, commit statuses, and Actions are distinct permission surfaces. Never claim a generic “read-only” scope guarantees every feature.

**Access model:** Every API request resolves the authenticated instance user; all repository/PR/search/analytics reads are filtered by that user's currently authorized connections and repository entitlements. Shared canonical GitHub records may be cached internally, but private data must not leak through cross-user joins, counts, search, logs, notifications, or stale access after revocation. Prefer explicit user–repository entitlement records and revalidation after connection changes.

## 6. Initial data model

- `User`, `Session`, `InstanceSetting`, `UserPreference`.
- `GitHubAccount` (provider account ID, login), `GitHubConnection` (owner user, connection type, status, scopes/permissions, timestamps), `GitHubInstallation` (installation ID, account, selection metadata), `EncryptedCredential` (key version, ciphertext, nonce/tag; never plaintext).
- `Repository` (immutable GitHub repository ID, owner/name, visibility, metadata), `UserRepositoryAccess` (user, repository, connection, relationship(s), access status, last verified).
- `PullRequest` (GitHub node/REST ID, repo, number, author, state, draft, branches, timestamps, merged_at, latest sync); `PullRequestReview`, `ReviewRequest`, `CheckRun`/`CheckSuiteSummary`, `CommitStatus`, `DiscussionSummary`.
- `ActionItem` (user, PR, reason, evidence, severity, first_seen, last_seen, resolved_at), `GitHubEvent` (source event ID/delivery ID, time, relevant user/repo/PR), `SyncCursor`, `SyncRun`, `WebhookDelivery`.

Use stable GitHub IDs rather than repository names as primary identity. Define retention for events and stale private data. Avoid persisting full private PR descriptions/comments unless needed for a selected feature; document data minimization and deletion behavior.

## 7. Sync and classification

### Initial synchronization
1. Verify user identity, connection validity, available permissions, and selected repository coverage.
2. Discover owned and collaborator repositories; discover external contributed repositories via authorized user PR search/history, with pagination and explicit completeness limits.
3. Upsert repositories, relevant PRs, reviews, checks, and sync cursors.
4. Build user-scoped action items and aggregates. Show progress and partial failures.

### Ongoing synchronization
- GitHub App: verify webhook signatures against the raw request body; deduplicate delivery IDs; enqueue processing; re-fetch authoritative state for relevant changes; periodically reconcile missed events and permissions.
- PAT: scheduled incremental polling with ETags/conditional requests where supported, adaptive cadence, pagination, retry/backoff, and GitHub primary/secondary rate-limit handling.
- On disconnect/revocation: stop sync, invalidate access, remove credentials, and hide/purge private data according to documented policy.

### Action rules (v1)
- `REVIEW_REQUESTED`: authenticated GitHub user/team is currently requested to review, subject to available identity/team data.
- `CHANGES_REQUESTED`: relevant latest review state requests changes on user's PR; avoid counting outdated reviews as current without verification.
- `CI_FAILED`: relevant head commit has failing required/reported checks; label missing/inaccessible check data as unknown.
- `UNRESOLVED_DISCUSSION`: confirmed unresolved review thread accessible through authorized API.
- `WAITING_FOR_REVIEW`: user's open non-draft PR awaits a review; show factual basis and elapsed time.
- `READY_TO_MERGE_CANDIDATE`: non-draft PR with available positive review/check signals; **not** a guarantee that GitHub permits merging.

Rules must be deterministic, documented, independently testable, and recomputed on relevant state changes. The same PR may produce several action reasons; inbox counts should distinguish unique PRs from total reasons.

## 8. API and UX contracts

Example API groups: `/auth`, `/connections`, `/repositories`, `/repositories/:id`, `/pull-requests`, `/pull-requests/:id`, `/inbox`, `/analytics/overview`, `/activity`, `/search`, `/sync/status`, `/webhooks/github`.

List endpoints: server-side pagination, validated filters/sort, stable cursors or page tokens, per-user authorization, consistent totals/coverage metadata. Search: user-scoped repository/PR index with keyboard navigation; do not expose unauthorized private names in autocomplete. Display source timestamp and sync freshness on views.

URL patterns (illustrative): `/overview`, `/inbox`, `/pull-requests?state=open&ci=failed`, `/pull-requests/:internalId`, `/repositories?visibility=private`, `/repositories/:internalId`, `/activity`, `/settings/connections`.

## 9. Security and privacy baseline

- Least-privilege, read-only GitHub permissions; no repository write permissions in v1.
- Encrypt stored PATs using authenticated encryption (e.g., AES-256-GCM) with a separate server-side key, per-record nonce, key versioning, and rotation plan. Never expose secrets to the browser, client-side storage, logs, error telemetry, or analytics.
- Protect GitHub App private keys and webhook secrets via secret files/secure environment injection; rotate and revoke appropriately. Use short-lived installation tokens rather than persisting them as long-term credentials.
- Secure HttpOnly/SameSite session cookies, CSRF protection where relevant, robust password hashing if local passwords are supported, rate limits, safe account recovery, session invalidation.
- Verify webhook signatures and replay/deduplication; validate OAuth/state and callback origins where applicable.
- Enforce authorization in backend queries, not just UI filters; test two-user isolation and revocation cases extensively.
- Sanitize/render untrusted GitHub Markdown safely; protect against XSS/SSRF, unsafe redirects, and malicious repository metadata.
- No telemetry by default; opt-in diagnostics only. Provide credential deletion, user data deletion, backup warnings, and security disclosure instructions.
- For multi-user public instances: require HTTPS, secure admin bootstrap, signup policy (invite-only or configurable), and abuse/rate-limit controls.

## 10. Phased implementation

### Phase 0 — Discovery and design validation
- Verify GitHub API endpoints, App vs PAT permissions, installation/user token distinctions, webhook events, external PR discovery, rate limits, and organization limitations.
- Finalize UI mockups, accessibility behavior, typography, product naming, and design tokens.
- Define v1 acceptance criteria and fixtures before implementation.

### Phase 1 — Foundation
- Monorepo, lint/typecheck/test/CI, Docker Compose, Postgres/Redis, migrations, secure instance bootstrap, login/session management, top-nav UI shell, light/dark theme.
- Acceptance: two test users can sign in independently; unauthorized routes and data are blocked; clean VM install works.

### Phase 2 — GitHub connection and repository explorer
- GitHub App setup/authorization/install flow; PAT fallback; connection health; credential encryption; repository discovery; ownership/visibility classification; full repository list/detail.
- Acceptance: each user sees only authorized owned, collaborating, and discovered external-contribution repositories; partial coverage is explained.

### Phase 3 — PR explorer and detail pages
- PR/review/check sync; canonical PR details; all PR category pages; filters/sort/search/pagination; responsive desktop table/mobile cards.
- Acceptance: counts match accessible synchronized records, list drill-downs work, and PR details show source timestamps and GitHub links.

### Phase 4 — Action Inbox and analytics
- Explainable action rules, inbox groups, unique PR vs reason counts, dashboard metric cards, opened/merged trends, repository distribution, activity timeline.
- Acceptance: rule fixtures cover multi-reason PRs, outdated reviews, missing checks, draft PRs, and unknown mergeability.

### Phase 5 — Reliability and security hardening
- Webhooks, deduplication, reconciliation, incremental PAT sync, retries/rate-limit handling, revocation and purge, cross-user isolation tests, backup/restore, accessibility and mobile QA.
- Acceptance: repeated webhooks are idempotent; disconnected users lose access; no credentials leak in logs/API; recovery and migrations are documented.

### Phase 6 — Open-source release
- README with screenshots, one-command Docker deployment, configuration reference, GitHub App setup guide, PAT permissions guide, architecture docs, CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, issue/PR templates, changelog, versioned releases.
- Choose and include an explicit OSI-approved license (MIT or Apache-2.0) after reviewing desired patent/contribution terms. Publish demo data/screenshots without private user information.

## 11. Testing and release gates

- Unit: classification rules, repository relationships, visibility, permissions, date-scoped metrics, pagination/filter parsing.
- Integration: GitHub API adapters with recorded/synthetic fixtures, token expiry, pagination, partial permissions, webhooks, duplicate/out-of-order events, retries, migrations.
- Security: two-user private-repo isolation, unauthorized search/counts, revocation, token/log redaction, webhook signature failures, XSS via PR Markdown.
- E2E: onboarding → sync → dashboard → filtered PR list → detail → repository page → disconnect, in light/dark and desktop/mobile viewports.
- Operations: cold-start setup, backup/restore, upgrade migration, worker crash/recovery, rate-limit and GitHub outage states.

## 12. Open questions to resolve before coding

1. Instance registration: invite-only by default, admin-approved, or configurable public signup?
2. GitHub App distribution: each self-hosted instance registers its own App, or optional shared hosted App for simpler onboarding? Document callback/webhook and trust implications.
3. Local login vs GitHub sign-in for instance authentication; how to map multiple GitHub accounts per user.
4. External-contribution history window and maximum initial-sync depth; clear completeness indicators.
5. Exact checks/review/mergeability rules and API permission matrix, verified against current GitHub documentation.
6. Brand name/logo/accent; Geist vs Inter vs IBM Plex Sans; open-source license.
7. Default retention, private-data purge policy, and whether administrators can view users' synced metadata (recommend no by default).

## 13. Definition of v1 done

A new operator can deploy the application on a VM with documented Docker Compose steps; create a secure instance; onboard multiple isolated users; connect GitHub via App or supported fine-grained PAT; discover authorized repositories and relevant PRs; browse complete filterable PR/repository lists and read-only details; use a rule-based Action Inbox and analytics overview; and maintain data safely through webhook/poll sync, failures, revocations, upgrades, and backups.

**Guiding constraint:** Make the dashboard useful and trustworthy before adding AI, write actions, or integrations.
