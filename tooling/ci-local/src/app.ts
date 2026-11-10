import { existsSync, readFileSync, renameSync, rmSync } from "node:fs";
import { arch } from "node:os";
import { join } from "node:path";

import { cacheDir, capture, lock, mustRun, repoRoot, run } from "./run.ts";

export type Platform = "ios" | "android";

/** The ABI the local emulator runs; CI's emulator is x86_64. */
export const androidAbi = arch() === "arm64" ? "arm64-v8a" : "x86_64";

async function withLock<T>(path: string, fn: () => Promise<T>): Promise<T> {
  const release = await lock(path, true);
  if (typeof release === "number") throw new Error(`lock ${path} held`);
  try {
    return await fn();
  } finally {
    release();
  }
}

/** The Maestro version CI pins, installed next to (never over) ~/.maestro. */
export async function installMaestro(log: string): Promise<string> {
  const workflow = readFileSync(
    join(repoRoot, ".github/workflows/e2e.yml"),
    "utf8",
  );
  const version = /MAESTRO_VERSION: "([\d.]+)"/.exec(workflow)?.[1];
  if (!version)
    throw new Error("No MAESTRO_VERSION in .github/workflows/e2e.yml");
  const dir = join(cacheDir, `maestro-${version}`);
  const bin = join(dir, "maestro/bin");
  await withLock(`${dir}.lock`, async () => {
    if (existsSync(bin)) return;
    const zip = `${dir}.zip`;
    await mustRun(
      "curl",
      [
        "-fsSL",
        "-o",
        zip,
        `https://github.com/mobile-dev-inc/Maestro/releases/download/cli-${version}/maestro.zip`,
      ],
      { log },
    );
    await mustRun("unzip", ["-q", "-o", zip, "-d", dir], { log });
    rmSync(zip);
  });
  return bin;
}

/**
 * The e2e app with this worktree's JS: the native part comes from a cache
 * shared by every worktree, keyed like CI's, and repack.sh swaps in the JS.
 * Returns the .app or .apk to install.
 */
export async function buildApp(
  platform: Platform,
  workDir: string,
  log: string,
  env: NodeJS.ProcessEnv,
): Promise<string> {
  const key = capture("bash", ["apps/expo/e2e/native-key.sh", platform], {
    env,
  });
  const abi = platform === "android" ? androidAbi : "arm64";
  const cached = join(cacheDir, "native", `${key}-${abi}`);
  const build = (out: string) =>
    mustRun("bash", ["apps/expo/e2e/build-native.sh", platform, out, abi], {
      log,
      env,
    });

  // A build made just now already carries this worktree's JS.
  const builtNow = await withLock(`${cached}.lock`, async () => {
    if (existsSync(cached)) return false;
    const partial = `${cached}.partial`;
    rmSync(partial, { recursive: true, force: true });
    await build(partial);
    renameSync(partial, cached);
    return true;
  });

  rmSync(workDir, { recursive: true, force: true });
  await mustRun("cp", ["-R", cached, workDir], { log });
  const app = join(
    workDir,
    platform === "ios" ? "Flatsby.app" : "app-release.apk",
  );
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
