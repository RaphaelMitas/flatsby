# Releasing the mobile app

One command cuts a release:

```bash
pnpm release           # patch bump (0.6.24 -> 0.6.25)
pnpm release minor     # 0.6.24 -> 0.7.0
pnpm release major     # 0.6.24 -> 1.0.0
pnpm release 0.7.3     # explicit version
pnpm release --direct  # commit straight to main instead of opening a PR
pnpm release --dry-run # print the plan without writing or pushing anything
```

The script bumps `version` in `apps/expo/app.config.ts`, pushes a
`release/vX.Y.Z` branch, and opens a PR with auto-merge enabled. When the PR
lands on main, `.github/workflows/release.yml` takes over:

1. **Tag + release** - tags the merge commit `vX.Y.Z` and creates a GitHub
   release with generated notes.
2. **Build + submit** - runs `eas build --platform all --profile production
--auto-submit` and waits for build + submission (iOS: App Store Connect,
   ascAppId `6747908544`; Android: the Play internal track, which internal
   testers get right away).
   Progress: https://expo.dev/accounts/flatsby/projects/flatsby/builds
3. **Store screenshots** - builds e2e simulator/emulator binaries, runs the
   Maestro flow `apps/expo/e2e/screenshots/store-screenshots.yaml` on an
   iPhone Pro Max simulator and a Pixel 7 emulator (clean 9:41 status bar),
   and attaches the screenshots to the GitHub release as
   `flatsby-vX.Y.Z-{ios,android}-screenshots.zip` (also workflow artifacts
   for 30 days).
4. **Store listings + review** - `publish-ios` uploads the screenshots to
   the App Store listing (en-US), sets the listing text and "What's New"
   for every locale from `apps/expo/store/<locale>/`, and submits the build
   for review with automatic release (retrying while Apple processes the
   binary). `publish-android` uploads the screenshots, the same listing text
   and the same release notes to Play and promotes the build from internal
   to production, which sends it to Google review and then live at 100%
   (managed publishing is off). Landing the release on main therefore
   publishes everything with no manual step - edit
   `apps/expo/store/<locale>/release_notes.txt` for every locale before
   cutting a release, or in the release PR.

If a job fails, use **Re-run failed jobs** on that run. **Run workflow** on
the Release workflow (or `gh workflow run release.yml`) re-runs the whole
release for the current version, including `publish-ios`, which pulls a
pending iOS submission out of review to resubmit it.

## Required repo configuration

All GitHub repo settings, nothing local (already configured as of Aug 2026):

- **`EXPO_TOKEN`** (repo secret, required for build + submit): a robot access
  token for the `flatsby` EAS org (https://expo.dev/settings/access-tokens).
  iOS submission also needs App Store Connect API credentials stored on EAS -
  already the case if `eas submit -p ios` has ever run interactively.
- **`ASC_API_KEY_ID` / `ASC_API_ISSUER_ID` / `ASC_API_KEY_CONTENT`** (repo
  secrets, required for the App Store listing update + review submission):
  an App Store Connect API key with the App Manager role (App Store Connect
  -> Users and Access -> Integrations). `ASC_API_KEY_CONTENT` is the full
  contents of the downloaded `.p8` file. Until set, `publish-ios` skips with
  a warning and the build stays in TestFlight for manual submission.
- **`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`** (repo secret, required for the Play
  listing update and release): the same service-account JSON EAS uses for
  Play submissions. Until set, `publish-android` skips with a warning and
  the build stays on the internal track for manual promotion.

## Notes

- Store screenshots are taken from an `E2E_TESTING=true` build (that build
  exposes the e2e-login deep link); the store binary itself comes from EAS
  and never contains e2e code.
- The screenshot jobs run their own web app (`tooling/github/e2e-stack`) with
  no Autumn key, so nothing they do can spend AI credits: every AI procedure
  checks credits first and falls back when the check fails.
- Marketing version comes from `app.config.ts`; build numbers auto-increment
  remotely on EAS (`appVersionSource: "remote"`).
- `apps/expo/store/<locale>/` is the source of truth for listing text. Its
  top-level files use deliver's names and go to the App Store, which reads
  the folder directly; `description.txt` and `release_notes.txt` also go to
  Play, next to the Play-only fields in `play/`. Store-side edits to these
  fields are overwritten by the next release; fields without a file, like
  promotional text or the Play video, are left alone.
  `scripts/check-store-text.mjs` runs in CI and fails when a locale is
  missing a file, a file is empty, or a text is over its store limit
  (release notes: 500, Play's cap).
- A new locale is a new folder, plus one manual step on the App Store:
  deliver only creates a locale's name, subtitle and privacy URL when an
  existing locale's values changed in the same run, so add the language in
  App Store Connect first.
- Screenshots are `en-US` only and synced: every App Store screenshot that
  wasn't captured, in any locale, is deleted. Other locales show the `en-US`
  ones.
- This is a fully automatic pipeline: once the release PR merges, the new
  version goes live on both stores (after store review) without further
  approval. Review the diff and release notes before merging.
- The screenshot flow lives outside `apps/expo/e2e/flows/`, so the regular
  e2e suite never runs it. Run it locally against `pnpm dev:next` with:

  ```bash
  cd apps/expo
  E2E_API_URL=http://localhost:3000 node e2e/run-flows.mjs ../screenshots/store-screenshots
  ```
