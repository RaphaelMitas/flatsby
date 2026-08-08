# AGENTS.md

## Overview

Flatsby is a collaborative household management app (shopping lists, expenses, groups) built as a TypeScript monorepo with mobile (Expo/React Native) and web (Next.js) clients sharing a common backend.

See `README.md` for full project documentation.

## Common Commands

```bash
pnpm dev              # Start all apps with watch mode
pnpm dev:next         # Next.js only
pnpm check            # Biome check + Prettier format check across all packages
pnpm check:fix        # Fix Biome lint errors and Prettier formatting
pnpm typecheck
pnpm db:generate      # Generate migration from schema changes
pnpm db:migrate       # Apply pending migrations
pnpm db:push          # Push Drizzle schema changes (local dev only)
pnpm db:studio        # Open Drizzle Studio
pnpm ui-add           # Add shadcn/ui components
pnpm -F @flatsby/nextjs dev
pnpm -F @flatsby/expo dev
```

## Code Style Guidelines

### No Barrel Files

Do not create `index.ts` files that re-export from other modules. Import directly from the specific file.

```typescript
// Bad
import { useMediaQuery, SplitViewContainer } from "../splitview";

// Good
import { useMediaQuery } from "../splitview/useMediaQuery";
import { SplitViewContainer } from "../splitview/SplitViewContainer";
```

### No Useless Comments

Do not add comments that merely describe what the code already clearly shows.

## Type Safety Guidelines

- **Avoid `as` type assertions** — use type guards or schema validation instead
- **Fix schemas** rather than casting — update the Zod schema to reflect reality
- **Use `satisfies`** for type checking without widening
- **Prefer `unknown` over `any`**
- **Let TypeScript infer** when possible

## tRPC Client Patterns

Uses `@trpc/tanstack-react-query` with React Query v5. Always use `useTRPC()` hook with `queryOptions()`/`mutationOptions()`:

```typescript
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

function MyComponent() {
  const trpc = useTRPC();

  const { data } = useQuery(trpc.user.getCurrentUser.queryOptions());

  const create = useMutation(
    trpc.chat.createConversation.mutationOptions({
      onSuccess: (data) => { /* ... */ },
    })
  );
}
```

Validators are shared Zod schemas in `packages/validators/` using `zod/v4`.

## Cursor Cloud

### Services

| Service | Command | Notes |
|---|---|---|
| Next.js web app (includes tRPC API) | `pnpm dev:next` | Runs on port 3000; loads `.env` from repo root via `dotenv` |
| All apps (web + Expo) | `pnpm dev` | Starts both Next.js and Expo dev servers |

### Environment variables

Copy `.env.example` to `.env` at the repo root. The Next.js app loads it via `dotenv -e ../../.env`. All required env vars are validated at startup by `@t3-oss/env-nextjs` schemas in `apps/nextjs/src/env.ts`, `packages/auth/env.ts`, and `packages/db/env.ts`. Validation is skipped when `CI=true` or during lint runs.

For local dev without real credentials, populate `.env` with placeholder strings. The dev server will start and render pages, but OAuth login and database operations will fail without real `DATABASE_URL` and OAuth provider credentials.

### Toolchain (cloud VM)

Use **Node 24.18.0** (`.nvmrc`) and **pnpm 11.20.0** (root `packageManager` field) via Corepack:

```bash
nvm install 24.18.0 && nvm use 24.18.0
export PATH="$NVM_DIR/versions/node/v24.18.0/bin:$PATH"   # before /exec-daemon/node
corepack enable && corepack prepare pnpm@11.20.0 --activate
pnpm install
```

Expo checks (no extra setup after `pnpm install`):

```bash
pnpm -F @flatsby/expo check
pnpm -F @flatsby/expo typecheck
```

### Non-obvious caveats

- **Node.js version**: Requires Node.js >= 24.18.0 (see `.nvmrc`). Cloud VMs may ship `/exec-daemon/node` (older Node) ahead of nvm on `PATH`; always prepend `$NVM_DIR/versions/node/v24.18.0/bin` after `nvm use` so `node -v` is 24.18+ before `pnpm install` or Expo/Next dev commands.
- **`pnpm db:push` in headless shells**: The root `pnpm db:push` task is marked `interactive` in `turbo.json` and fails without a Turbo UI. Use `cd packages/db && pnpm with-env drizzle-kit push --force` instead (non-interactive).
- **`.env` file**: Copy `.env.example` to `.env` and fill values (or sync from injected secrets). The dev server loads repo-root `.env` via `dotenv -e ../../.env`; shell-exported vars alone are not enough unless written to `.env`.
- **postinstall**: `pnpm install` runs `pnpm lint:ws` (sherif workspace linter) as a postinstall hook.
- **Env loading**: The Next.js dev server uses `dotenv -e ../../.env` (via the `with-env` script in `apps/nextjs/package.json`) to load env vars from the monorepo root `.env` file.
- **Turbo watch mode**: `pnpm dev:next` uses `turbo watch dev`, which rebuilds dependent packages (validators, db, auth, api, chat) on file changes automatically.
