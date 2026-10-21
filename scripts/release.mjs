#!/usr/bin/env node
/**
 * Cuts a release: bumps the app version in apps/expo/app.config.ts, pushes a
 * release/vX.Y.Z branch, and opens an auto-merging PR. Once the PR lands on
 * main, .github/workflows/release.yml tags the commit, builds + submits via
 * EAS, and captures store screenshots.
 *
 * Usage: pnpm release [patch|minor|major|<x.y.z>] [--direct] [--dry-run]
 *   --direct   commit the bump on main and push directly (skips the PR);
 *              requires push access to main.
 *   --dry-run  print what would happen without writing or pushing anything.
 *
 * Usage: pnpm release ota [message] [--dry-run]
 *   Publishes origin/main's JavaScript as an over-the-air update via
 *   .github/workflows/ota.yml; message defaults to main's latest commit subject.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(repoRoot, "apps/expo/app.config.ts");

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
    ...opts,
  })?.trimEnd();
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const direct = args.includes("--direct");
const dryRun = args.includes("--dry-run");
const [bump = "patch", otaMessage] = args.filter((a) => !a.startsWith("--"));

if (bump === "ota") {
  console.log("Fetching origin/main...");
  run("git", ["fetch", "origin", "main"]);
  const [sha, subject] = run("git", [
    "log",
    "-1",
    "--format=%h%n%s",
    "origin/main",
  ]).split("\n");
  const message = otaMessage ?? subject;
  if (dryRun) {
    console.log(
      `Dry run; a real run would publish origin/main (${sha}) as an OTA update: "${message}"`,
    );
    process.exit(0);
  }
  run("gh", [
    "workflow",
    "run",
    "ota.yml",
    "--ref",
    "main",
    "-f",
    `message=${message}`,
  ]);
  console.log(
    `✓ OTA update of ${sha} queued. Watch: gh run watch, or the Actions tab.`,
  );
  process.exit(0);
}

// In --dry-run mode, guard failures are reported but don't abort, so the
// plan prints from any branch/state.
function guard(ok, message) {
  if (ok) return;
  if (dryRun) console.warn(`! would fail: ${message}`);
  else fail(message);
}

guard(
  run("git", ["status", "--porcelain"]) === "",
  "Working tree is not clean; commit or stash your changes first.",
);

const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
guard(
  branch === "main",
  `Releases start from main (currently on "${branch}").`,
);

console.log("Fetching origin/main...");
run("git", ["fetch", "origin", "main"]);
guard(
  run("git", ["rev-parse", "HEAD"]) ===
    run("git", ["rev-parse", "origin/main"]),
  "Local main is not in sync with origin/main; pull (or push) first.",
);

const config = readFileSync(configPath, "utf8");
const versionMatch = /version: "(\d+)\.(\d+)\.(\d+)"/.exec(config);
if (!versionMatch)
  fail(`Could not find a version: "x.y.z" line in ${configPath}`);

const [current, major, minor, patch] = versionMatch;
const next =
  bump === "major"
    ? `${Number(major) + 1}.0.0`
    : bump === "minor"
      ? `${major}.${Number(minor) + 1}.0`
      : bump === "patch"
        ? `${major}.${minor}.${Number(patch) + 1}`
        : bump;

if (!/^\d+\.\d+\.\d+$/.test(next)) {
  fail(
    `Invalid version or bump type "${bump}" (expected patch, minor, major, or x.y.z).`,
  );
}

if (
  run("git", ["ls-remote", "--tags", "origin", `refs/tags/v${next}`]) !== ""
) {
  fail(`Tag v${next} already exists on origin.`);
}

const currentVersion = current.slice('version: "'.length, -1);
console.log(`Releasing v${next} (current: v${currentVersion})`);

if (dryRun) {
  console.log(`
Dry run; nothing written or pushed. A real run would:
  1. set version: "${next}" in apps/expo/app.config.ts${
    direct
      ? `
  2. commit "Release v${next}" on main and push`
      : `
  2. push branch release/v${next} and open a PR with auto-merge`
  }
  3. on merge to main, the Release workflow tags v${next}, builds + submits
     via EAS (iOS review + Play production), and uploads listing text from
     apps/expo/store/<locale>/ and store screenshots to both stores`);
  process.exit(0);
}

writeFileSync(configPath, config.replace(current, `version: "${next}"`));
run("git", ["add", "apps/expo/app.config.ts"]);

if (direct) {
  run("git", ["commit", "-m", `Release v${next}`]);
  run("git", ["push", "origin", "main"]);
  console.log(`✓ Pushed release commit to main.`);
} else {
  const releaseBranch = `release/v${next}`;
  run("git", ["checkout", "-b", releaseBranch]);
  run("git", ["commit", "-m", `Release v${next}`]);
  run("git", ["push", "-u", "origin", releaseBranch]);

  const prBody = [
    `Bumps the app version to v${next}.`,
    "",
    "Once this lands on main, the Release workflow will:",
    `1. tag the merge commit as v${next} and create a GitHub release`,
    "2. run EAS production builds and submit them (iOS review + Play production)",
    "3. upload listing text from apps/expo/store/<locale>/ and fresh store screenshots to both stores",
    "",
    'Check apps/expo/store/<locale>/release_notes.txt for every locale before merging - it becomes the "What\'s New" text on both stores, and the release goes live on both after store review.',
  ].join("\n");
  console.log(
    run("gh", [
      "pr",
      "create",
      "--title",
      `Release v${next}`,
      "--body",
      prBody,
    ]),
  );
  try {
    run("gh", ["pr", "merge", "--auto", "--squash"]);
    console.log("✓ Auto-merge enabled; the release starts when CI passes.");
  } catch {
    console.log(
      "Could not enable auto-merge; merge the PR manually to start the release.",
    );
  }
  run("git", ["checkout", "main"]);
}

console.log(
  `✓ v${next} is on its way. Watch: gh run watch, or the Actions tab.`,
);
