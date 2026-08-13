# [AGENTS.md](http://AGENTS.md)

You are an agent working in the Flatsby repo. This file exists to tell you how to
change this codebase and what to know before you do. It is not a README. If you want
to know what Flatsby does for the people who use it, read `README.md`. If you want to
know how to touch it without breaking it, keep reading.

Treat what follows as good defaults, not hard rules. The developer prompting you
overrides anything here.

## What Flatsby is

Flatsby is a household management app. People living together share shopping lists,
split expenses, and settle debts. It is a TypeScript monorepo: an Expo app for iOS and
Android, a Next.js app for web, and a set of shared packages that both clients depend
on. The tRPC API lives inside the Next.js app, so the web app is also the backend.

Both clients are real products with real users. Neither is a demo of the other.

## What we never compromise on

**Real-time sync.** The product is people editing the same list at the same time and
seeing it happen. Optimistic updates are everywhere: over twenty components use
`onMutate`, across both clients, and about thirty files invalidate queries. This is
not incidental polish, it is the feature. A change that swaps an optimistic update for a spinner, drops an
invalidation, or makes one client wait on a refetch is a regression even when nothing
throws. If you touch a mutation, say what happens to its optimistic path and its
invalidations.

**Web and mobile parity.** Both clients talk to the same router and the same
validators. A feature that lands on one client is not done. If parity genuinely does
not apply, say so out loud and say why, rather than leaving it silently uneven. This
is the single most common way work in this repo goes wrong, so there is a checklist
for it below.

## A note from Ruffy

I like small changes that leave the codebase smaller than they found it. Search for
the helper that already exists before you write a new one. Code that rhymes with code
nearby is a signal to refactor, not to copy.

Do not preserve complexity because it is already there, and do not add machinery
because it looks thorough. When you find yourself building a staged rollout, a
migration path, or a config surface I did not ask for, stop and ask. I would rather
review ten lines twice than a hundred once.

Be honest about what you actually ran. "Typecheck passes, I could not run the
simulator" is worth more to me than a confident summary I find out is wrong.

## Glossary

Use these words when you talk to me, because they are the words I use.

- **you**: the agent reading this and changing Flatsby.
- **I**, **me**, **Ruffy**: the person you are working with.
- **user**: someone using the Flatsby app. Not me.
- **group**: a household. The unit of sharing and the unit of access control.
- **member**: a user's membership in a group, carrying a role.
- **list**: a shopping list, owned by a group.
- **expense**: a cost one member paid, split across members.
- **settlement**: a payment that clears debt between two members.
- **surface**: one place a feature has to exist. See the checklist below.
- **client**: the Expo app or the Next.js app.
- **shared packages**: everything under `packages/`, which both clients depend on.
- **catalog**: the pinned dependency versions in `pnpm-workspace.yaml`. Bumping a
dependency usually means editing the catalog, not a package's `package.json`.



## Hit every surface

The most common defect here is a change that works on the path you tested and is
missing everywhere else. Before you call work done, walk this list and say which
entries applied.

- **Both clients.** `apps/expo` and `apps/nextjs`. Shared behavior belongs in
`packages/`, not copied into each client.
- **The router.** `packages/api/src/router/`. New data access goes through a procedure,
not a direct query from a client.
- **The validators.** `packages/validators/`. Input and output shapes are shared Zod
schemas using `zod/v4`. If you changed a shape in one place and not here, the other
client will find out at runtime.
- **The schema.** `packages/db/`. Schema changes need a generated migration, not just
a push.
- **Group scoping.** Every query that reads group data goes through
`DbUtils.ensureGroupMember` in `packages/api/src/utils.ts`. There is no group-scoped
procedure middleware, so this is enforced per router and easy to forget. Forgetting
it leaks one household's data to another.
- **Optimistic paths.** If a mutation has an `onMutate`, changing its input or output
means changing the optimistic update too.
- **E2E flows.** `apps/expo/e2e/flows/` covers account, auth, expenses, group, home,  
shopping-list, and smoke. A feature change in one of those areas usually needs its  
flow updated.

## Where things live

```
apps/expo        Expo app, iOS and Android
apps/nextjs      Next.js web app, and the tRPC API
packages/api     tRPC routers, procedures, group access helpers
packages/auth    Better Auth config, shared by both clients
packages/db      Drizzle schema and migrations
packages/chat    AI chat feature
packages/ui      Shared web components, shadcn based
packages/validators  Shared Zod schemas
tooling/         Shared configs, and the composite GitHub Actions setup
```

Complexity belongs at the edges. Routers stay thin, shared logic goes in packages, UI  
components stay dumb.

## Commands

```bash
pnpm dev                      # all apps, watch mode
pnpm dev:next                 # web only
pnpm check                    # Biome and Prettier across the workspace
pnpm check:fix                # fix what is fixable
pnpm typecheck                # every package, this is the one that catches parity breaks
pnpm db:generate              # generate a migration from schema changes
pnpm db:migrate               # apply pending migrations
pnpm db:studio
pnpm ui-add                   # add shadcn components
pnpm -F @flatsby/expo typecheck
pnpm -F @flatsby/nextjs dev
```

Node and pnpm versions come from `.nvmrc` and the root `packageManager` field. Read
them, do not assume them, and do not write them down anywhere else.

A few things that will surprise you:

- `pnpm db:push` is marked interactive in `turbo.json` and fails in a headless shell.
Run `drizzle-kit push --force` from `packages/db` via `pnpm with-env` instead. Push
is local dev only, real changes get a generated migration.
- Env vars load from a repo-root `.env` via `dotenv`. Exporting them in your shell is
not enough. `@t3-oss/env-nextjs` validates them at startup and skips validation when
`CI=true`.
- `pnpm install` runs `pnpm lint:ws` as a postinstall hook.
- `pnpm dev:next` is `turbo watch dev`, so shared packages rebuild on change without  
you restarting anything.

