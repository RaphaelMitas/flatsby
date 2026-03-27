# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Flatsby is a collaborative household management app (shopping lists, expenses, groups) built as a TypeScript monorepo. See `CLAUDE.md` for common commands and code style guidelines, and `README.md` for full project documentation.

### Services

| Service | Command | Notes |
|---|---|---|
| Next.js web app (includes tRPC API) | `pnpm dev:next` | Runs on port 3000; loads `.env` from repo root via `dotenv` |
| All apps (web + Expo) | `pnpm dev` | Starts both Next.js and Expo dev servers |

### Environment variables

Copy `.env.example` to `.env` at the repo root. The Next.js app loads it via `dotenv -e ../../.env`. All required env vars are validated at startup by `@t3-oss/env-nextjs` schemas in `apps/nextjs/src/env.ts`, `packages/auth/env.ts`, and `packages/db/env.ts`. Validation is skipped when `CI=true` or during `pnpm lint`.

For local dev without real credentials, populate `.env` with placeholder strings. The dev server will start and render pages, but OAuth login and database operations will fail without real `DATABASE_URL` and OAuth provider credentials.

### Non-obvious caveats

- **Node.js version**: Requires Node.js >= 24.14.1 (see `.nvmrc`). Use `nvm install 24.14.1 && nvm use 24.14.1` if not already on this version.
- **Build scripts warning**: `pnpm install` may warn about ignored build scripts for `protobufjs` and `sharp`. These are non-blocking for development; the `onlyBuiltDependencies` allowlist in `pnpm-workspace.yaml` intentionally permits only `@tailwindcss/oxide` and `esbuild`.
- **postinstall**: `pnpm install` runs `pnpm lint:ws` (sherif workspace linter) as a postinstall hook.
- **Env loading**: The Next.js dev server uses `dotenv -e ../../.env` (via the `with-env` script in `apps/nextjs/package.json`) to load env vars from the monorepo root `.env` file.
- **Turbo watch mode**: `pnpm dev:next` uses `turbo watch dev`, which rebuilds dependent packages (validators, db, auth, api, chat) on file changes automatically.
