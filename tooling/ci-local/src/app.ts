import { execFile } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  utimesSync,
} from "node:fs";
import { arch } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import {
  cacheDir,
  capture,
  mustRun,
  repoRoot,
  run,
  tryLock,
  withLock,
} from "./run.ts";

export type Platform = "ios" | "android";

export const localAndroidAbi = arch() === "arm64" ? "arm64-v8a" : "x86_64";

/** Never over ~/.maestro, which other tools on the machine may own. */
export async function installMaestro(): Promise<string> {
  const { stdout } = await promisify(execFile)(
    "bash",
    ["apps/expo/e2e/install-maestro.sh", join(cacheDir, "maestro")],
    { cwd: repoRoot },
  );
  return stdout.trim();
}

const KEEP_BUILDS = 3;

// Native builds are hundreds of MB and every native change adds one; keep the
// most recently used, skipping any another run holds.
function pruneNative(platform: Platform, abi: string): void {
  const dir = join(cacheDir, "native");
  const builds = readdirSync(dir)
    .filter((name) => name.startsWith(`e2e-native-${platform}-`))
    .filter((name) => name.endsWith(`-${abi}`))
    .map((name) => join(dir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  for (const build of builds.slice(KEEP_BUILDS)) {
    const release = tryLock(`${build}.lock`);
    if (typeof release === "number") continue;
    rmSync(build, { recursive: true, force: true });
    release();
  }
}

// The native part comes from a cache every worktree shares; repack.sh swaps
// in this worktree's JS.
export async function buildApp(
  platform: Platform,
  workDir: string,
  log: string,
  toolEnv: NodeJS.ProcessEnv,
): Promise<string> {
  // Metro's cache lives in TMPDIR and repack resets it, so each run gets its
  // own and leaves other worktrees' bundles alone.
  const tmp = `${workDir}-tmp`;
  mkdirSync(tmp, { recursive: true });
  const env = { ...toolEnv, TMPDIR: tmp };
  const key = capture("bash", ["apps/expo/e2e/native-key.sh", platform], {
    env,
  });
  const abi = platform === "android" ? localAndroidAbi : "arm64";
  const cached = join(cacheDir, "native", `${key}-${abi}`);
  const build = (out: string) =>
    mustRun("bash", ["apps/expo/e2e/build-native.sh", platform, out, abi], {
      log,
      env,
    });

  rmSync(workDir, { recursive: true, force: true });
  // Copied under the lock, so a prune elsewhere can't delete it mid-copy.
  const builtNow = await withLock(`${cached}.lock`, async () => {
    const missing = !existsSync(cached);
    if (missing) {
      const partial = `${cached}.partial`;
      rmSync(partial, { recursive: true, force: true });
      await build(partial);
      renameSync(partial, cached);
    }
    const now = new Date();
    utimesSync(cached, now, now);
    await mustRun("cp", ["-R", cached, workDir], { log });
    return missing;
  });
  pruneNative(platform, abi);
  const app = join(
    workDir,
    platform === "ios" ? "Flatsby.app" : "app-release.apk",
  );
  // A build made just now already carries this worktree's JS.
  if (builtNow) return app;
  const repack =
    platform === "ios"
      ? ["apps/expo/e2e/repack.sh", "ios", app]
      : [
          "apps/expo/e2e/repack.sh",
          "android",
          app,
          join(workDir, "bundle-res"),
        ];
  if ((await run("bash", repack, { log, env })) === 0) return app;

  // A bundle the cached build can't take (new images, another Hermes train):
  // this worktree's own build, which the next matching worktree can't reuse.
  rmSync(workDir, { recursive: true, force: true });
  await build(workDir);
  return app;
}
