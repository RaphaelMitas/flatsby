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
   ascAppId `6747908544`; Android: the Play **internal track** until Google
   grants production access - flip `track` to `"production"` in
   `apps/expo/eas.json` once approved, since a Play-side submission failure
   would also block `publish-ios`).
   Progress: https://expo.dev/accounts/flatsby/projects/flatsby/builds
3. **Store screenshots** - builds e2e simulator/emulator binaries, runs the
   Maestro flow `apps/expo/e2e/screenshots/store-screenshots.yaml` on an
   iPhone Pro Max simulator and a Pixel 7 emulator (clean 9:41 status bar),
   and attaches the screenshots to the GitHub release as
   `flatsby-vX.Y.Z-{ios,android}-screenshots.zip` (also workflow artifacts
   for 30 days).
4. **Store listings + review** - `publish-ios` uploads the screenshots to
   the App Store listing (en-US), sets "What's New" from
   `apps/expo/store/release-notes.txt`, and submits the build for review
   with automatic release (retrying while Apple processes the binary).
   `publish-android` uploads the screenshots and the same release notes to
   the Play listing (en-US). A tag push therefore publishes everything with
   no manual step - edit `apps/expo/store/release-notes.txt` before cutting
   a release.

Re-run a release for the current version (e.g. after a failed job) from the
Actions tab via **Run workflow** on the Release workflow, or `gh workflow run
release.yml`.

## Required repo configuration

All GitHub repo settings, nothing local (already configured as of Aug 2026):

- **`EXPO_TOKEN`** (repo secret, required for build + submit): a robot access
  token for the `flatsby` EAS org (https://expo.dev/settings/access-tokens).
  iOS submission also needs App Store Connect API credentials stored on EAS -
  already the case if `eas submit -p ios` has ever run interactively.
- **`AUTUMN_SECRET_KEY` / `AI_GATEWAY_API_KEY`** (repo secrets, optional, not
  set yet): passed to the web app the screenshot jobs run on the runner (see
  `tooling/github/e2e-stack`). Without them billing shows the free plan and AI
  categorization falls back to "other", which no flow asserts against.
- **`ASC_API_KEY_ID` / `ASC_API_ISSUER_ID` / `ASC_API_KEY_CONTENT`** (repo
  secrets, required for the App Store listing update + review submission):
  an App Store Connect API key with the App Manager role (App Store Connect
  -> Users and Access -> Integrations). `ASC_API_KEY_CONTENT` is the full
  contents of the downloaded `.p8` file. Until set, `publish-ios` skips with
  a warning and the build stays in TestFlight for manual submission.
- **`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`** (repo secret, required for the Play
  listing screenshot upload): the same service-account JSON EAS uses for
  Play submissions. Until set, `publish-android` skips with a warning (the
  binary still reaches the production track via EAS).

## Notes

- Store screenshots are taken from an `E2E_TESTING=true` build (that build
  exposes the e2e-login deep link); the store binary itself comes from EAS
  and never contains e2e code.
- Marketing version comes from `app.config.ts`; build numbers auto-increment
  remotely on EAS (`appVersionSource: "remote"`).
- Listing uploads assume the `en-US` locale and only touch the provided
  assets: iPhone 6.9" / Play phone screenshots are replaced, existing iPad
  screenshots and all other listing content stay untouched.
- This is a fully automatic pipeline: once the release PR merges, the new
  version goes live on both stores (after Apple review) without further
  approval. Review the diff and release notes before merging.
- The screenshot flow lives outside `apps/expo/e2e/flows/`, so the regular
  e2e suite never runs it. Run it locally against `pnpm dev:next` with:

  ```bash
  cd apps/expo
  E2E_API_URL=http://localhost:3000 node e2e/run-flows.mjs ../screenshots/store-screenshots
  ```
