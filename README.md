# Let Me Out

Internal web application for employee absence management. Employees request absences (holidays, sick leave, personal days, etc.), designated validators approve or reject them, auditors have read-only visibility, and administrators manage users, absence types, and teams.

## Features

- Role-based access: **Employee**, **Validator**, **Auditor**, **Administrator**
- Full absence lifecycle: draft → pending → approved / rejected / cancelled
- Validation history and audit trail on every status change
- Observations and file attachments (JPEG, PNG, PDF — max 5 MB) on absences
- Email notifications at each transition
- Calendar view per employee and per team
- CSV export for auditors
- Team management with per-team auditor visibility

## Architecture & stack

| Layer    | Technology                                                                              |
| -------- | --------------------------------------------------------------------------------------- |
| Monorepo | Turborepo + pnpm workspaces                                                             |
| Backend  | NestJS · Prisma · PostgreSQL 16                                                         |
| Frontend | Vite · React 18 · TanStack Router · TanStack Query · Zustand · shadcn/ui · Tailwind CSS |
| Shared   | `@repo/types` (enums, interfaces, Zod schemas) · `@repo/config` (ESLint/TS/Prettier)    |

Hexagonal architecture with CQRS (`@nestjs/cqrs`) on the backend. JWT authentication stored exclusively in `httpOnly` cookies. UUID v7 as primary key on every table.

## Repository structure

```
apps/
  api/        # NestJS backend
  web/        # Vite + React SPA
packages/
  types/      # Shared types, enums and Zod schemas
  config/     # Shared tooling configuration (ESLint, TypeScript, Prettier)
docs/         # Architecture, requirements and conventions
```

## Requirements

- Node.js 24
- pnpm 9.x
- PostgreSQL 16

## Quick start

1. Copy the environment template and fill in the required values:

   ```bash
   cp .env.example .env
   ```

2. Set `DATABASE_URL` to point to your PostgreSQL instance.

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Apply database migrations:

   ```bash
   pnpm --filter @repo/api prisma:migrate
   ```

5. Seed initial data (admin user + base absence types):

   ```bash
   pnpm --filter @repo/api exec prisma db seed
   ```

6. Start backend and frontend in watch mode:

   ```bash
   pnpm dev
   ```

   The backend listens on the port defined by `APP_PORT` (default `3000`). The frontend is served at `http://localhost:5173`.

## Environment variables

Full reference in `.env.example`. Key variables:

| Variable                  | Description                                                     | Example                                                    |
| ------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`            | PostgreSQL connection string                                    | `postgresql://user:pass@localhost:5432/absence_management` |
| `APP_PORT`                | Backend listening port                                          | `3000`                                                     |
| `APP_URL`                 | Public URL of the **frontend** — used in activation email links | `http://localhost:5173`                                    |
| `JWT_SECRET`              | Secret for access tokens (min 32 chars)                         | —                                                          |
| `JWT_REFRESH_SECRET`      | Secret for refresh tokens (different from `JWT_SECRET`)         | —                                                          |
| `JWT_EXPIRES_IN`          | Access token lifetime                                           | `15m`                                                      |
| `JWT_REFRESH_EXPIRES_IN`  | Refresh token lifetime                                          | `7d`                                                       |
| `SMTP_HOST`               | SMTP host for outgoing email                                    | `smtp.example.com`                                         |
| `SMTP_PORT`               | SMTP port                                                       | `587`                                                      |
| `SMTP_SECURE`             | Use TLS (`true`) or STARTTLS (`false`)                          | `false`                                                    |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials                                                | —                                                          |
| `SMTP_FROM`               | Sender address                                                  | `"Let Me Out" <no-reply@company.com>`                      |
| `CORS_ORIGIN`             | Frontend URL allowed by CORS                                    | `http://localhost:5173`                                    |
| `COOKIE_SAMESITE`         | Cookie SameSite policy                                          | `none` (cross-site) / `strict` (same-site)                 |
| `COOKIE_SECURE`           | Secure flag on cookies                                          | `true` in production                                       |
| `SEED_ADMIN_EMAIL`        | Initial administrator email                                     | `admin@company.com`                                        |
| `SEED_ADMIN_PASSWORD`     | Initial administrator password                                  | —                                                          |
| `SEED_ADMIN_NAME`         | Initial administrator display name                              | `Administrator`                                            |
| `VITE_API_URL`            | API URL used by the frontend                                    | `http://localhost:3000`                                    |

> **`APP_URL` must point to the frontend origin, not the backend.** If this is misconfigured, activation email links will be broken.

## Seed: initial data

The seed creates the first administrator user and the base absence types. It is **idempotent** — running it multiple times is safe.

<details>
<summary>When to run the seed</summary>

- The first time you set up the environment (local, staging, or production), after applying migrations.
- In CI/CD, as a step after `prisma migrate deploy`.
- Any time you recreate the database from scratch.

</details>

```bash
pnpm --filter @repo/api exec prisma db seed
```

## Commands reference

### Monorepo root

| Command          | Description                              |
| ---------------- | ---------------------------------------- |
| `pnpm install`   | Install dependencies across all packages |
| `pnpm dev`       | Start backend and frontend in watch mode |
| `pnpm build`     | Build all packages                       |
| `pnpm test`      | Run tests across all packages            |
| `pnpm typecheck` | Global TypeScript check                  |
| `pnpm lint`      | Global lint                              |
| `pnpm format`    | Check formatting with Prettier           |

### Backend (`apps/api`)

| Command                                       | Description                    |
| --------------------------------------------- | ------------------------------ |
| `pnpm --filter @repo/api dev`                 | Backend in watch mode          |
| `pnpm --filter @repo/api build`               | Build the backend              |
| `pnpm --filter @repo/api test`                | Unit tests with Jest           |
| `pnpm --filter @repo/api typecheck`           | TypeScript check (no emit)     |
| `pnpm --filter @repo/api prisma:generate`     | Regenerate Prisma Client       |
| `pnpm --filter @repo/api prisma:migrate`      | Apply migrations (development) |
| `pnpm --filter @repo/api prisma:studio`       | Open Prisma Studio             |
| `pnpm --filter @repo/api exec prisma db seed` | Run the seed                   |

Prisma scripts in `apps/api` automatically load the `.env` file from the repo root.

### Frontend (`apps/web`)

| Command                             | Description                 |
| ----------------------------------- | --------------------------- |
| `pnpm --filter @repo/web dev`       | Frontend in watch mode      |
| `pnpm --filter @repo/web build`     | Build the frontend          |
| `pnpm --filter @repo/web test`      | Component tests with Vitest |
| `pnpm --filter @repo/web typecheck` | TypeScript check (no emit)  |

### Shared packages

| Command                          | Description      |
| -------------------------------- | ---------------- |
| `pnpm --filter @repo/types test` | Test Zod schemas |

## Testing

```bash
# All packages
pnpm test

# Backend only
pnpm --filter @repo/api test

# Frontend only
pnpm --filter @repo/web test

# Shared schemas only
pnpm --filter @repo/types test
```

Minimum coverage thresholds: **80%** lines and branches on the backend, **70%** on the frontend.

## Troubleshooting

<details>
<summary>Backend does not start after <code>pnpm dev</code></summary>

Verify that `DATABASE_URL` points to a reachable PostgreSQL instance and that migrations have been applied:

```bash
pnpm --filter @repo/api prisma:migrate
```

</details>

<details>
<summary>Frontend shows a blank screen or CORS error</summary>

Make sure `CORS_ORIGIN` in `.env` matches exactly the URL from which you serve the frontend (default `http://localhost:5173`). Also verify that `VITE_API_URL` points to the correct backend port.

</details>

<details>
<summary>Session is not persisted (user is redirected to login on every reload)</summary>

JWT tokens are stored in `httpOnly` cookies. If the frontend and backend are on different origins you need `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`, and the browser must be on HTTPS (or `localhost`). On local `http://localhost` both flags are optional.

</details>

<details>
<summary>Seed fails with a password error</summary>

The `SEED_ADMIN_PASSWORD` value must satisfy the password policy: minimum 8 characters, at least one uppercase letter, one lowercase letter, one digit, and one symbol. Adjust the value in `.env`.

</details>

<details>
<summary>Activation email link is broken or leads to a 404</summary>

`APP_URL` must point to the **frontend** origin (e.g. `http://localhost:5173`), not to the backend. Check the value in `.env` and in your deployment environment variables.

</details>

## Conventions

- TypeScript strict mode in every package — no exceptions.
- All schema changes via Prisma migrations; never manual SQL.
- JWT exclusively in `httpOnly` cookies — never in `localStorage` or `sessionStorage`.
- UUID v7 generated on the backend with the `uuidv7` library; never autoincrement.
- Commit messages in English, Conventional Commits format. See [`docs/commit-conventions.md`](docs/commit-conventions.md).
- Never push directly to `main`. Every task starts with a branch and a PR.

## Documentation index

| Document                                                                     | Contents                                                                                                  |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [`docs/non-negotiable.md`](docs/non-negotiable.md)                           | 35 absolute rules. No exceptions. Read this first.                                                        |
| [`docs/requirements.md`](docs/requirements.md)                               | 73 functional requirements (RF-01 to RF-73) across 15 sections                                            |
| [`docs/technical-requirements.md`](docs/technical-requirements.md)           | Full stack, monorepo structure, 11 database models, migration strategy, environment variables             |
| [`docs/best-practices-architecture.md`](docs/best-practices-architecture.md) | Hexagonal architecture, SOLID with TypeScript examples, CQRS with `@nestjs/cqrs`, global error handling   |
| [`docs/best-practices-backend.md`](docs/best-practices-backend.md)           | NestJS, Prisma and PostgreSQL conventions: validation, transactions, security, logging, pagination, tests |
| [`docs/best-practices-frontend.md`](docs/best-practices-frontend.md)         | React, TanStack Query/Router, React Hook Form + Zod, accessibility, performance, RTL + MSW tests          |
| [`docs/commit-conventions.md`](docs/commit-conventions.md)                   | Commit message format, valid types, rules and examples                                                    |
| [`docs/a11y-audit-2025-06.md`](docs/a11y-audit-2025-06.md)                   | WCAG 2.1 AA accessibility audit report (June 2025)                                                        |
| [`docs/pending-fixes-2026-03.md`](docs/pending-fixes-2026-03.md)             | Analysis and implementation plan for known pending issues (March 2026)                                    |
