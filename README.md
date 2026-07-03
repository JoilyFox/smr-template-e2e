<!-- Base README snippet — composed first by the CLI. Describe only the base app. -->

## Overview

A production-ready Nest.js backend. Includes typed config, global validation, a consistent error format,
logging, a health-check endpoint and Swagger.

## Local run

```bash
cp .env.example .env
npm install
npm run start:dev
```

- Swagger: `http://localhost:3000/docs`
- Health: `GET http://localhost:3000/health`

## Scripts

| Script             | Description            |
|--------------------|------------------------|
| `npm run start:dev`| Watch mode dev server. |
| `npm run build`    | Compile to `dist/`.    |
| `npm run lint`     | Lint and auto-fix.     |
| `npm test`         | Unit tests.            |
| `npm run test:e2e` | End-to-end tests.      |

## Project structure

```
src/
├── common/             # filters, interceptors, errors, logger
├── config/             # app.config.ts, env.validation.ts
├── health/             # health.controller.ts, health.module.ts
├── generated.module.ts # CLI-emitted aggregator of the selected feature modules
├── app.module.ts
└── main.ts
```

`generated.module.ts` is empty in the base app. When you generate a project with features selected,
the CLI overwrites it to import the chosen blocks' modules (database / cache / auth) — `app.module.ts`
itself is never modified.

<!-- Pino logger README snippet. -->

## Logging — Pino

This block replaces the base `LoggerService` (a Nest `ConsoleLogger`) with a structured
[pino](https://github.com/pinojs/pino) logger:

- Emits structured JSON in production; pretty-printed single-line logs in development (`pino-pretty`).
- Respects `LOG_LEVEL` from `.env`.
- Same `LoggerService` class and DI token, so call sites and `app.useLogger(...)` are unchanged.

<!-- Postgres + Prisma README snippet. -->

## Database — PostgreSQL (Prisma)

Set `DATABASE_URL` in `.env`. With Docker, `docker compose up postgres` starts a local instance.

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

This block adds PostgreSQL integration via Prisma:
- Configures `PrismaService`, which implements NestJS lifecycle hooks to manage connections, and
  exports it so any feature module can inject it.

### Demo CRUD (`--with-examples`)

- An `Item` model is defined in `prisma/schema.prisma` (`id`, `name`, `description`, `createdAt`,
  `updatedAt`); `prisma/seed.ts` populates a few rows.
- `ItemsService` + Swagger-annotated `ItemsController` expose a sample REST resource:
  - `POST /items`, `GET /items`, `GET /items/:id`, `PUT /items/:id`, `DELETE /items/:id`.
- This is starter scaffolding — delete `src/database/items.*` and the `Item` model once you have your
  own resources.

<!-- Redis README snippet. -->

## Cache — Redis

Set `REDIS_URL` in `.env`. With Docker, `docker compose up redis` starts a local instance.


This block adds Redis caching support:
- Configures `CacheService` to wrap `ioredis`.
- Exposes standard async methods: `get(key)`, `set(key, value, ttlSeconds?)`, and `del(key)`.

Inject `CacheService` into your own modules to read and write cache entries. No
HTTP endpoints are shipped — expose cache operations only behind your own
authenticated routes.

<!-- BullMQ queue README snippet. -->

## Queue — BullMQ

Background job processing with [BullMQ](https://docs.bullmq.io/), backed by the same Redis the cache
block provides (this block requires `--cache redis`). Connection comes from `REDIS_URL`.

- `QueueModule` registers a `demo` queue.
- `QueueService` enqueues jobs; `DemoProcessor` handles them asynchronously.
- Demo endpoint: `POST /queue/jobs` — body is passed through as the job payload.

Replace the demo queue/processor with your own, or remove these files once you add real queues.

<!-- RabbitMQ messaging README snippet. -->

## Messaging — RabbitMQ

Event-driven messaging over RabbitMQ using Nest microservices (hybrid app).

- Set `RABBITMQ_URL` and `RABBITMQ_QUEUE` in `.env`. `docker compose up rabbitmq` starts a local
  broker (management UI on `http://localhost:15672`, guest/guest).
- `RabbitMessagingService.publish(pattern, data)` emits events via a `ClientProxy`.
- The consumer (`@EventPattern`) runs as a microservice connected in `main.ts`
  (`connectRabbitMessaging`, wired through the generated bootstrap hook).
- Demo endpoint: `POST /messaging/rabbitmq/publish` → emits an `app.event` the app also consumes.
- Namespaced under `src/messaging/rabbitmq/` so it can run alongside other transports (e.g. Kafka).

<!-- Kafka messaging README snippet. -->

## Messaging — Kafka

Event-driven messaging over Apache Kafka using Nest microservices (hybrid app).

- Set `KAFKA_BROKERS` (comma-separated), `KAFKA_CLIENT_ID`, `KAFKA_GROUP_ID` in `.env`.
  `docker compose up kafka` starts a single-node KRaft broker.
- `KafkaMessagingService.publish(topic, data)` emits events via a `ClientProxy`.
- The consumer (`@EventPattern`) runs as a microservice connected in `main.ts`
  (`connectKafkaMessaging`, wired through the generated bootstrap hook).
- Demo endpoint: `POST /messaging/kafka/publish` → emits an `app.event` the app also consumes.
- Namespaced under `src/messaging/kafka/` so it can run alongside other transports (e.g. RabbitMQ).

<!-- Auth core README snippet (always included when any auth strategy is selected). -->

## Auth — core

The shared auth core, included automatically whenever one or more auth strategies are selected. It
owns the pieces every strategy reuses:

- A self-contained, in-memory `UsersService` so the app compiles without a database block.
- `AuthService` — issues and refreshes JWT access/refresh token pairs.
- Decorators `@Public()` (opt a route out of an applied auth guard) and `@CurrentUser()` (inject the authenticated user).
- Endpoints in `AuthController`:
  - `POST /auth/register` — Register a new user and retrieve a token pair.
  - `POST /auth/login` — Validate credentials and retrieve a token pair.
  - `POST /auth/refresh` — Issue a new token pair using a valid refresh token.

Set `JWT_SECRET` / `JWT_REFRESH_SECRET` (and the expiry vars) in `.env`. Both secrets are
**required** and must be at least 16 characters — the app fails fast at boot if either is missing or
too short, so tokens can never be signed with a weak or default key. Each selected strategy adds its
own routes/guards on top of this core.

<!-- JWT strategy README snippet. -->

## Auth — JWT strategy

Adds bearer-token validation on top of the auth core. Protected routes use a JWT guard;
`@Public()` opts a route out, `@CurrentUser()` injects the authenticated user. Swagger is configured
with bearer auth.

- Implements `JwtStrategy` (validates the `Authorization: Bearer <token>` header) and a
  global-ready `JwtAuthGuard`.
- Exposes `GET /auth/me` — returns the profile of the current authenticated user (requires a Bearer
  token issued by `POST /auth/login` or `/auth/register`).

<!-- Google OAuth strategy README snippet. -->

## Auth — Google OAuth strategy

Adds a Google sign-in path on top of the auth core. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_CALLBACK_URL` in `.env`. The Google strategy handles the OAuth callback, maps the profile to
an app user, and issues the same JWT pair as password login.

- Provides a `GoogleStrategy` mapping profiles from Google OAuth to local user objects.
- Endpoints in `GoogleAuthController`:
  - `GET /auth/google` — Redirects users to Google's sign-in consent screen.
  - `GET /auth/google/callback` — Verifies the callback, provisions/looks up the user, and returns
    the safe profile fields **plus** an app `accessToken` / `refreshToken`. The Google OAuth
    `accessToken` is used server-side only and is never returned to the client.
- Callback response shape:
  ```json
  {
    "message": "Google login successful",
    "user": {
      "googleId": "google-user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "picture": "https://lh3.googleusercontent.com/..."
    },
    "accessToken": "app-jwt-access-token",
    "refreshToken": "app-jwt-refresh-token"
  }
  ```

<!-- OpenTelemetry README snippet. -->

## Observability — OpenTelemetry

Distributed tracing via the [OpenTelemetry](https://opentelemetry.io/) Node SDK with auto
instrumentation (HTTP, Nest, common DB/Redis clients).

- Initialised in `src/tracing/otel.ts`, imported **first** in `main.ts` (via
  `generated.instrumentation.ts`) so it patches libraries before they load.
- Exports OTLP traces over HTTP to `OTEL_EXPORTER_OTLP_ENDPOINT` (default `http://localhost:4318`).
- Set `OTEL_SERVICE_NAME` to identify this service in your tracing backend.

Run a local collector (e.g. Jaeger with OTLP enabled) to view traces.

<!-- GitHub Actions CI/CD README snippet. -->

## CI/CD — GitHub Actions

This project ships two workflows under `.github/workflows/`:

- **`ci.yml`** — on every push and pull request: `npm ci` → lint → test → build.
- **`deploy.yml`** — on push to `main`/`master` (or manual run): builds a Docker image,
  pushes it to **GitHub Container Registry (GHCR)** as `ghcr.io/<owner>/<repo>`, then SSHes
  into your VPS and rolls it out with `docker compose`.

The app is containerized by the `Dockerfile` (multi-stage, runs `node dist/main`) and run on
the VPS via `docker-compose.prod.yml`, which layers the `app` service on top of the infra
services in `docker-compose.yml` (database / cache / broker, if any).

### Required GitHub Actions secrets

Add these under **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
| --- | --- |
| `VPS_HOST` | VPS hostname or IP |
| `VPS_USER` | SSH user |
| `VPS_SSH_KEY` | Private SSH key for that user (PEM contents) |
| `VPS_PORT` | _(optional)_ SSH port — defaults to `22` |
| `VPS_APP_DIR` | _(optional)_ deploy directory on the VPS — defaults to `~/app` |

GHCR auth in the build job uses the built-in `GITHUB_TOKEN` — no extra secret needed.

### One-time VPS setup

1. Install Docker and the Compose plugin.
2. Let the VPS pull the image. Either make the GHCR package **public**
   (repo → Packages → package → visibility), or run once on the VPS:
   ```sh
   echo <GHCR_PAT> | docker login ghcr.io -u <github-username> --password-stdin
   ```
   (a PAT with `read:packages`).
3. Create the deploy directory and the runtime env file:
   ```sh
   mkdir -p ~/app && cd ~/app
   cp /path/to/.env.example .env   # then fill in real values
   ```

After that, every push to `main` builds, pushes, and deploys automatically.

> Adjust the trigger branches, the `Dockerfile` build steps (e.g. add `npx prisma generate`),
> and the exposed `PORT` to match your stack.

## Agent hooks — foundation

This block provides the shared foundation for the **agent hooks** (Claude Code hooks) under
`.agent-hooks/`. Agent hooks run *while an AI coding agent (Claude Code) works* — real-time
guardrails and orientation, wired via [`.claude/settings.json`](https://code.claude.com/docs/en/hooks):
block risky edits/commands, catch secrets the moment they're written, orient the agent at session
start, ping you when it finishes.

> The **git hooks** (`--git-hooks`) are a separate, self-contained layer under `.githooks/` (husky
> commit/push checks) with their **own** lib + config. The two layers share no files — pick either or
> both independently.

### The `.agent-hooks/` layer

Portable, zero-dependency Node scripts (they run on macOS/Linux/Windows with no install step) plus the
agent hooks' config:

- [`lib/hook-io.mjs`](./.agent-hooks/lib/hook-io.mjs) — shared helpers (config loading, git, glob, the
  Claude Code stdin/stdout protocol).
- [`config.json`](./.agent-hooks/config.json) — **committed team defaults**: which agent hooks are on
  (`enabled`) and how each behaves (guard deny-lists, secrets, ntfy topic).
- `config.local.json` — **optional, gitignored per-developer overrides**, deep-merged over
  `config.json`. Copy [`config.local.example.json`](./.agent-hooks/config.local.example.json) to
  `config.local.json` and flip any agent hook off locally (e.g. `{ "enabled": { "notify": false } }`)
  without affecting the team.

The exact set of agent hooks depends on what was selected at generation time. Each selected package
documents itself below.

### Agent hook: `guard`

Blocks the agent from doing two dangerous classes of thing, **before** they happen:

- **Sensitive files** — edits/writes to `.env`, `migrations/`, private keys, `secrets/`, etc. are
  denied (`.env.example` and friends are allowed). Path-based; see
  `.agent-hooks/guard-paths.mjs`.
- **Dangerous commands** — `rm -rf /`, force-pushes to `main`/`master`/`prod`, `DROP DATABASE`,
  destructive `kubectl … prod`, etc. are denied. See `.agent-hooks/guard-bash.mjs`.

Tune both deny-lists in `.agent-hooks/config.json` → `guard`.

### Agent hook: `secrets`

After the agent edits a file, scans **that file's contents** for hardcoded secrets and asks the
agent to fix it before moving on — so a token/key/password never even reaches a commit. Complements
`guard` (which blocks by path) by looking at content.

- Uses [`gitleaks`](https://github.com/gitleaks/gitleaks) when it's on your `PATH` (authoritative).
  Install it for best results (`brew install gitleaks`, or see the repo).
- Falls back to a small high-confidence regex check when gitleaks isn't installed — a missing binary
  never breaks the agent loop.

For an authoritative gate over the whole staged diff at commit time (`gitleaks protect --staged`),
also select the **git-hooks** `secrets` check (`--git-hooks secrets`) — it catches secrets from any
tool or teammate, not just the agent.

Configure via `.agent-hooks/config.json` → `secrets`.

### Agent hook: `context`

On session start, injects a short repo snapshot into the agent's context — current branch,
ahead/behind vs upstream, uncommitted changes, and last commit — so it orients itself immediately
instead of spending requests running `git status` / `git branch`. See
`.agent-hooks/session-context.mjs`.

Disable it locally (e.g. you prefer a clean context) with `{ "enabled": { "context": false } }` in
`.agent-hooks/config.local.json`.

### Agent hook: `notify`

Pings you when the agent **finishes a task** (`Stop`) or **needs your attention** (`Notification`):

- **Desktop** — native notification (macOS/Linux; Windows falls back to phone-only).
- **Phone** — optional push via [ntfy.sh](https://ntfy.sh). Opt in by setting a topic:
  `export NTFY_TOPIC=my-secret-topic` (or `.agent-hooks/config.json` → `notify.ntfyTopic`), then
  subscribe to that topic in the ntfy mobile app. Self-host by setting `notify.ntfyServer`.

A short debounce (`notify.minSecondsBetween`, default 30s) keeps rapid turns from spamming you;
attention prompts always fire. Never commit your ntfy topic — treat it like a secret and keep it in
your local env.

## Git hooks

This project wires [husky](https://typicode.github.io/husky/) git hooks that run automatically on
`git commit` and `git push` — the enforcement gate that applies to **everyone**, human or tool. Unlike
the agent hooks (which only run inside Claude Code), these guard the repository itself.

Each git hook delegates to the `.githooks/run-phase.mjs` dispatcher, which runs the checks selected
for that phase:

| Hook | Phase dir | When | Checks (if selected) |
|------|-----------|------|----------------------|
| `.husky/pre-commit` | `.githooks/pre-commit/` | before a commit is created | format, secrets, no-commit-to-main |
| `.husky/commit-msg` | `.githooks/commit-msg/` | on the commit message | commitlint |
| `.husky/pre-push` | `.githooks/pre-push/` | before pushing | typecheck, test, build |

**Fast at commit, thorough at push:** file-scoped checks (format, secrets) gate every commit so they
stay cheap; the slow, whole-project checks (typecheck, full test suite, build) run once at push time.

**Config lives here too.** Everything git-hook-related is self-contained under `.githooks/`:
`.githooks/config.json` holds the committed team defaults — the `enabled` on/off map plus each check's
settings (`commitlint.types`, `no-commit-to-main.branches`, `typecheck.tsconfig`, …). The agent hooks
have their own separate config under `.agent-hooks/`; the two never mix.

**Toggle locally.** Turn a check off just for yourself by copying `.githooks/config.local.example.json`
to `.githooks/config.local.json` (gitignored) and setting e.g. `{ "enabled": { "test": false } }`. It's
deep-merged over `config.json`, so your override never affects teammates.

**Bypass once** with `git commit --no-verify` or `git push --no-verify` when you really need to.

> husky activates on `npm install` via the `prepare` script — but only once the repo has a `.git`
> directory. If you generated without `--skip-git`, it's already wired; otherwise run `git init` then
> `npm run prepare`.

### Git hook: `format` (pre-commit)

Runs Prettier `--write` and ESLint `--fix` over the **staged** code files, then re-stages them — so
every commit is formatted with the project's own config. Best-effort: it tidies but never blocks the
commit. See `.githooks/pre-commit/format.mjs`. Toggle with `enabled.format` in
`.githooks/config.json` / `config.local.json`.

### Git hook: `secrets` (pre-commit)

Runs [`gitleaks protect --staged`](https://github.com/gitleaks/gitleaks) over the staged diff and
**blocks the commit** if a secret is found — catching secrets from any source (other tools, teammates,
merges), not just the AI agent. Soft-skips when gitleaks isn't installed (set
`secrets.failIfGitleaksMissing: true` to make it required). See `.githooks/pre-commit/secrets.mjs`.
Toggle with `enabled.secrets`.

### Git hook: `no-commit-to-main` (pre-commit)

Blocks commits made directly on a protected branch (`main`/`master` by default), nudging toward a
feature-branch + PR workflow. Configure the branch list via `.githooks/config.json` → `"no-commit-to-main".branches`.
See `.githooks/pre-commit/no-commit-to-main.mjs`. Toggle with `enabled.no-commit-to-main`.

### Git hook: `commitlint` (commit-msg)

Enforces the [Conventional Commits](https://www.conventionalcommits.org/) format
(`<type>(scope): summary`) on every commit message. **Zero-dependency** — no `@commitlint` install; a
small validator checks the type, optional scope, `!` breaking marker, and subject length. Merge/revert/
fixup commits are exempt. Configure allowed types + max length via `.githooks/config.json` → `commitlint`. See
`.githooks/commit-msg/commitlint.mjs`. Toggle with `enabled.commitlint`.

### Git hook: `typecheck` (pre-push)

Runs a whole-project `tsc --noEmit` before you push, so type errors never reach the remote. Runs once
at push time (not per-commit, not per-edit) to stay out of your way. Configure the tsconfig via
`.githooks/config.json` → `typecheck.tsconfig`. See `.githooks/pre-push/typecheck.mjs`. Toggle with
`enabled.typecheck`.

### Git hook: `test` (pre-push)

Runs the project's test suite (Jest or Vitest, auto-detected) before you push, blocking the push if
tests fail. Runs at push time rather than per-commit so local commits stay fast. See
`.githooks/pre-push/test.mjs`. Toggle with `enabled.test`.

### Git hook: `build` (pre-push)

Runs the production build (`npm run build`) before you push, so a broken build never reaches the
remote. Configure the script name via `.githooks/config.json` → `build.script`. See
`.githooks/pre-push/build.mjs`. Toggle with `enabled.build`.

### 📖 Atomic-Concept Wiki Documentation System

The project is pre-configured with an **Atomic-Concept Wiki** located in the `docs/` folder. It is designed to act as a structured, low-token, and highly precise codebase navigation index for both developers and AI agents.

#### Layout
* `docs/_MAP.md` — The main index file acting as the entry point, containing `[[wikilinks]]` to components.
* `docs/architecture/` — Auto-generated mapping of NestJS Modules and component relationships.
* `docs/api/` — Auto-generated mapping of HTTP endpoints, controllers, and routing paths.
* `docs/concepts/` — Space for developer-authored conceptual documentation (e.g. business logic, workflows).

#### Keep Docs Synchronized
To scan your code and automatically update the wiki structure:
```bash
npm run docs:sync
```

#### Visualizing the Knowledge Graph
Because the system uses standard Markdown `[[wikilinks]]`, you can open the project folder in **Obsidian** to explore an interactive, visual knowledge graph of the codebase structure and business domains.

### Agent hook: `pr-reviewer`

An AI agent orchestrator that reviews Pull Requests locally before they are pushed or from CI pipelines. It checks the PR diff, fetches details from linked Jira tickets, scores issues on a scale of 1-100, and interactively prompts the developer before writing comments.

#### How to run locally:

1. Populate your API tokens in `.env`:
   ```env
   GEMINI_API_KEY=your-gemini-api-key
   JIRA_EMAIL=you@example.com
   JIRA_API_TOKEN=your-jira-api-token
   GIT_PROVIDER_TOKEN=your-git-provider-token
   ```

2. Configure the behavior (thresholds, providers) in `./pr-reviewer/pr-reviewer.config.json`.

3. Run the CLI tool:
   ```bash
   npm run review-pr <PR_NUMBER>
   ```
