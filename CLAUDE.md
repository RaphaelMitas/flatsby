# CLAUDE.md

Flatsby is a collaborative household management app (shopping lists, expenses, groups) built as a TypeScript monorepo with mobile (Expo/React Native) and web (Next.js) clients sharing a common backend.

## Common Commands

```bash
pnpm dev              # Start all apps with watch mode
pnpm dev:next         # Next.js only
pnpm lint             # ESLint across all packages
pnpm lint:fix
pnpm typecheck
pnpm format           # Check Prettier formatting
pnpm format:fix
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
