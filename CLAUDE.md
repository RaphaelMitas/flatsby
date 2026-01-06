# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flatsby is a collaborative household management app (shopping lists, expenses, groups) built as a TypeScript monorepo with mobile (Expo/React Native) and web (Next.js) clients sharing a common backend.

## Common Commands

```bash
# Development
pnpm dev              # Start all apps (Next.js + Expo) with watch mode
pnpm dev:next         # Start only Next.js web app

# Code Quality (run before committing)
pnpm lint             # ESLint across all packages
pnpm lint:fix         # Auto-fix ESLint errors
pnpm typecheck        # TypeScript type checking
pnpm format           # Check Prettier formatting
pnpm format:fix       # Fix formatting

# Database
pnpm db:push          # Push Drizzle schema changes to database
pnpm db:studio        # Open Drizzle Studio browser

# Working with specific packages
pnpm -F @flatsby/nextjs dev     # Run only Next.js
pnpm -F @flatsby/expo dev       # Run only Expo
pnpm -F @flatsby/api typecheck  # Typecheck only API package

# UI Components
pnpm ui-add           # Add shadcn/ui components interactively

# Mobile builds (EAS)
cd apps/expo
eas build --profile development    # Dev build
eas build --profile production     # Production build
eas update --channel development   # OTA update
```

## Architecture

### Monorepo Structure

```
apps/
├── expo/          # React Native mobile app (Expo Router for navigation)
└── nextjs/        # Next.js 15 web app (App Router)

packages/
├── api/           # tRPC routers and procedures (auth, group, shoppingList, expense, user)
├── auth/          # Better Auth configuration (Google + Apple OAuth)
├── db/            # Drizzle ORM schema and Neon PostgreSQL client
├── ui/            # Shared shadcn/ui components (web only)
└── validators/    # Shared Zod validation schemas

tooling/           # Shared configs (ESLint, Prettier, Tailwind, TypeScript)
```

### Key Patterns

**tRPC API Layer** (`packages/api/`):
- Routers defined in `src/router/` - main entry point is `src/root.ts`
- Uses Effect-TS for error handling (`src/errors.ts`, `src/utils.ts`)
- Context created in `src/trpc.ts` includes auth session and database client
- Type exports in `src/types.ts` for common database query result shapes

**Database** (`packages/db/`):
- Drizzle ORM with Neon serverless PostgreSQL
- Schema in `src/schema.ts` - tables prefixed with `flat-cove_` (legacy naming)
- Main entities: users, groups, groupMembers, shoppingLists, shoppingListItems, expenses, expenseSplits
- Exports: `@flatsby/db` (main), `@flatsby/db/client`, `@flatsby/db/schema`

**Authentication** (`packages/auth/`):
- Better Auth with OAuth (Google, Apple) and Expo native support
- Server-side: `initAuth()` configured in `apps/nextjs/src/auth/server.ts`
- Client-side (Expo): `apps/expo/src/utils/auth/auth-client.ts`
- API route: `/api/auth/[...all]` handles all auth endpoints

**tRPC Client Setup**:
- Next.js: `apps/nextjs/src/trpc/` - uses SSR with SuperJSON serialization
- Expo: `apps/expo/src/utils/api.tsx` - httpBatchLink with auth cookies

**Styling**:
- Web: Tailwind CSS v4 with shadcn/ui components
- Mobile: NativeWind (Tailwind for React Native)

### API Endpoints

The tRPC API at `/api/trpc` exposes these routers:
- `auth` - Session management
- `group` - Household group CRUD and membership
- `shoppingList` - Shopping lists and items management
- `expense` - Expense tracking with splits
- `user` - User preferences and settings

## Environment Variables

Required in `.env` (copy from `.env.example`):
- `DATABASE_URL` - Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Auth encryption key
- `BETTER_AUTH_URL` - Production URL for auth callbacks
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `APPLE_*` - Apple Sign In (service ID, bundle ID, private key, team ID, key ID)

## CI Pipeline

GitHub Actions runs on PRs and main branch:
- `pnpm lint && pnpm lint:ws` - Linting + workspace deps check
- `pnpm format` - Formatting check
- `pnpm typecheck` - TypeScript validation
