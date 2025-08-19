# Contributing to Flatsby

Thanks for your interest in contributing! This repo is open to collaborate in the open. You may see references to our website and org; that's expected.

## Getting Started

- Install prerequisites per `package.json#engines`
- Install deps: `pnpm i`
- Prepare env: copy `.env.example` to `.env` and adjust
- Useful scripts: `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`

## Branching & PRs

- Create a feature branch from `main`
- Write clear commits; prefer conventional style
- Open a PR with context and checklists (template provided)

## Testing & Linting

- Ensure `pnpm lint` and `pnpm typecheck` are clean
- Add or update tests when changing behavior

## Packages

This is a Turborepo monorepo. Use `pnpm -F <package>` to target a workspace. Example:

```bash
pnpm -F @flatsby/ui dev
```

## Development Tips

- Follow the existing TypeScript, ESLint, Prettier configs
- Use descriptive names and small PRs where possible

## Links

- Website: https://flatsby.com
- Docs: see package READMEs inside `apps/` and `packages/`
