<div align="center">

# Flatsby

**Shared shopping lists, split expenses, settled debts. Household management for people living together.**

[**flatsby.com**](https://www.flatsby.com)

<a href="https://apps.apple.com/app/id6747908544">
  <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" height="44">
</a>

<br><br>

<p>
  <img src="https://raw.githubusercontent.com/RaphaelMitas/flatsby/assets/web/web-home.png" alt="Flatsby dashboard on web" width="760">
</p>
<p>
  <img src="https://raw.githubusercontent.com/RaphaelMitas/flatsby/assets/ios/01-home.png" alt="Flatsby home on iOS" width="200">
</p>

</div>

Flatsby is one household in one place: everyone sees the same lists, the same
expenses, and the same balances, live on web, iOS, and Android. The
screenshots on this page are captured automatically from the real app on
every release.

## Shopping lists

Lists sync in real time. When a flatmate checks off the milk in the
supermarket, it disappears from your phone before they reach the till. Items
carry categories and who added them.

<p align="center">
  <img src="https://raw.githubusercontent.com/RaphaelMitas/flatsby/assets/web/web-shopping-list.png" alt="Shopping list on web" width="760">
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/RaphaelMitas/flatsby/assets/ios/02-shopping-list.png" alt="Shopping list on iOS" width="200">
  <img src="https://raw.githubusercontent.com/RaphaelMitas/flatsby/assets/ios/06-shopping-lists.png" alt="A group's shopping lists on iOS" width="200">
</p>

## Expenses and settling up

Log what you paid, split it equally or by exact amounts, and Flatsby keeps a
running balance per flatmate. Settlements clear debts between two people.

<p align="center">
  <img src="https://raw.githubusercontent.com/RaphaelMitas/flatsby/assets/web/web-expenses.png" alt="Expenses on web" width="760">
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/RaphaelMitas/flatsby/assets/ios/03-expenses.png" alt="Expenses on iOS" width="200">
  <img src="https://raw.githubusercontent.com/RaphaelMitas/flatsby/assets/ios/04-expense-split.png" alt="Splitting an expense on iOS" width="200">
</p>

## AI assistant

Ask about your household in plain language. The assistant reads your lists
and expenses, answers with charts and tables, and can add items or expenses
for you.

<p align="center">
  <img src="https://raw.githubusercontent.com/RaphaelMitas/flatsby/assets/web/web-chat.png" alt="AI chat with spending chart on web" width="760">
</p>

## Groups

A group is your household. Invite flatmates by email, manage roles, and keep
every list and expense scoped to the people who share the flat.

<p align="center">
  <img src="https://raw.githubusercontent.com/RaphaelMitas/flatsby/assets/ios/05-add-member.png" alt="Managing members on iOS" width="200">
</p>

## Tech

TypeScript monorepo. The tRPC API lives inside the Next.js app, so the web
app is also the backend for both clients.

- **Web**: Next.js, React, Tailwind, shadcn/ui, deployed on Vercel
- **Mobile**: Expo / React Native, NativeWind, Expo Router, built with EAS
- **API**: tRPC with shared Zod validators
- **Data**: PostgreSQL (Neon) via Drizzle ORM
- **Auth**: Better Auth (Google and Apple sign-in)
- **Tooling**: Turborepo, pnpm, Biome

```text
apps/expo        Expo app, iOS and Android
apps/nextjs      Next.js web app, and the tRPC API
packages/api     tRPC routers, procedures, group access helpers
packages/auth    Better Auth config, shared by both clients
packages/db      Drizzle schema and migrations
packages/chat    AI chat feature
packages/ui      Shared web components, shadcn based
packages/validators  Shared Zod schemas
tooling/         Shared configs and the GitHub Actions setup
```

## Development

Node and pnpm versions come from `.nvmrc` and the `packageManager` field in
`package.json`.

```bash
pnpm install
cp .env.example .env   # then fill in the values
pnpm db:migrate
pnpm dev               # web + mobile in watch mode, or pnpm dev:next for web only
```

Before committing: `pnpm check` and `pnpm typecheck`. Working conventions
for this repo live in [AGENTS.md](./AGENTS.md), and how to propose a change
in [CONTRIBUTING.md](./CONTRIBUTING.md).

Releases are fully automated: merging a release PR tags the version, builds
both apps, submits them to the stores, and recaptures every screenshot in
this README from the released code.

## License

MIT, see [LICENSE](./LICENSE). Built on the [T3 Stack](https://create.t3.gg/)
and [create-t3-turbo](https://github.com/t3-oss/create-t3-turbo).
