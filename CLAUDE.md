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
- `chat` - AI chat conversations and messages

### Validators Package (`packages/validators/`)

Shared Zod schemas for input validation and type inference. Uses `zod/v4`.

```typescript
// packages/validators/src/chat.ts example
import { z } from "zod/v4";

// Define schema
export const chatModelSchema = z.enum(["google/gemini-2.0-flash", "openai/gpt-4o"]);
export type ChatModel = z.infer<typeof chatModelSchema>;

// Input schemas for tRPC procedures
export const createConversationInputSchema = z.object({
  title: z.string().max(256).optional(),
  model: chatModelSchema.optional(),
});
export type CreateConversationInput = z.infer<typeof createConversationInputSchema>;
```

Import in routers:
```typescript
import { createConversationInputSchema } from "@flatsby/validators/chat";
```

### tRPC Client Usage (Next.js)

Uses `@trpc/tanstack-react-query` with React Query v5. **Always use these patterns:**

```typescript
"use client";
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

function MyComponent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Queries
  const { data, isLoading } = useQuery(
    trpc.user.getCurrentUser.queryOptions()
  );

  // Infinite queries (paginated)
  const { data, hasNextPage, fetchNextPage } = useInfiniteQuery(
    trpc.chat.getUserConversations.infiniteQueryOptions(
      { limit: 10 },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    )
  );

  // Mutations with callbacks
  const createConversation = useMutation(
    trpc.chat.createConversation.mutationOptions({
      onSuccess: (data) => { /* handle success */ },
      onError: (error) => { /* handle error */ },
    })
  );

  // Optimistic updates
  const deleteItem = useMutation(
    trpc.shoppingList.deleteItem.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: trpc.shoppingList.getItems.queryKey() });
        const previousData = queryClient.getQueryData(trpc.shoppingList.getItems.queryKey());
        queryClient.setQueryData(trpc.shoppingList.getItems.queryKey(), (old) => /* update */);
        return { previousData };
      },
      onError: (_err, _vars, context) => {
        if (context?.previousData) {
          queryClient.setQueryData(trpc.shoppingList.getItems.queryKey(), context.previousData);
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.shoppingList.getItems.queryKey() });
      },
    })
  );

  // Calling mutations - can pass callbacks inline for closure access
  const handleSubmit = () => {
    createConversation.mutate(
      { model: selectedModel },
      {
        onSuccess: (conversation) => {
          // Access local state via closure
          router.push(`/chat/${conversation.id}?message=${encodeURIComponent(message)}`);
        },
      }
    );
  };
}
```

**Query key helpers:**
- `trpc.router.procedure.queryKey()` - for regular queries
- `trpc.router.procedure.infiniteQueryKey()` - for infinite queries
- Pass input params to get specific keys: `queryKey({ id: "123" })`

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

## Type Safety Guidelines

This codebase prioritizes full type safety. Follow these rules:

- **Avoid `as` type assertions** - They bypass TypeScript's type checking and can hide bugs
- **Use type guards** instead of assertions when narrowing types
- **Fix schemas** rather than casting - If data doesn't match expected types, update the Zod schema to reflect reality
- **Use `satisfies`** for type checking without widening: `const x = { ... } satisfies MyType`
- **Prefer `unknown` over `any`** - Forces explicit type narrowing
- **Let TypeScript infer** when possible - Don't add redundant type annotations

```typescript
// Bad - type assertion hides potential issues
const data = response as MyType;

// Good - type guard with runtime check
if (isMyType(data)) {
  // data is now MyType
}

// Good - schema validates at runtime
const data = mySchema.parse(response);

// Good - satisfies checks type without assertion
const config = {
  host: "localhost",
  port: 3000,
} satisfies ServerConfig;
```
