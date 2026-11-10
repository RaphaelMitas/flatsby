import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { arch } from "node:os";
import { join, relative } from "node:path";
import { parseArgs, parseEnv } from "node:util";

import type { Platform } from "./app.ts";
import type { Gateway } from "./devices.ts";
import { buildApp, installMaestro } from "./app.ts";
import {
  acquireDevices,
  adb,
  androidHome,
  androidImage,
  avdmanager,
  emulatorBin,
  IOS_MODEL,
  sweepDeadRuns,
} from "./devices.ts";
import {
  cacheDir,
  capture,
  claimPorts,
  mustRun,
  repoRoot,
  run,
  stopRunning,
  tryCapture,
  tryLock,
} from "./run.ts";

const TARGETS = ["checks", "web", "ios", "android"] as const;
type Target = (typeof TARGETS)[number];

const USAGE = `pnpm ci:local [checks] [web] [ios] [android] [--areas a,b] [--devices N]

Runs CI on this machine: the checks from ci.yml and the e2e suites from
e2e.yml. Without targets it runs everything this machine supports.

  --areas     Maestro flow areas or files, e.g. group,shopping-list/items
  --devices   simulators or emulators per platform (default 2)

Devices are throwaway simulators and emulators unless SIMLOCK_URL and
SIMLOCK_TOKEN name a Simlock gateway to lease them from.`;

const STACK = "tooling/github/e2e-stack/stack.sh";

const stackPortEnv = (web: number) => ({
  PORT: String(web),
  PG_PORT: String(web + 1),
  DB_WSPROXY_PORT: String(web + 2),
});

// Mirrors the jobs in .github/workflows/ci.yml.
const CHECKS: [string, string[]][] = [
  ["pnpm", ["check"]],
  ["pnpm", ["lint:ws"]],
  ["node", ["scripts/check-store-text.mjs"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["test"]],
  ["pnpm", ["audit"]],
];

interface Result {
  target: Target;
  status: "passed" | "failed" | "skipped";
  detail?: string;
  seconds?: number;
  log?: string;
}

function javaHome(): string | undefined {
  if (process.platform === "darwin") {
    const home = tryCapture("/usr/libexec/java_home", ["-v", "17"]);
    if (home) return home;
  }
  return process.env.JAVA_HOME;
}

function gatewayFromEnv(): Gateway | undefined {
  const url = process.env.SIMLOCK_URL?.replace(/\/$/, "");
  const token = process.env.SIMLOCK_TOKEN;
  // Kept out of the environments the runner passes on, and so out of logs.
  delete process.env.SIMLOCK_TOKEN;
  if (!url && !token) return undefined;
  if (!url || !token)
    throw new Error("Set SIMLOCK_URL and SIMLOCK_TOKEN together");
  const { protocol, hostname } = new URL(url);
  if (protocol !== "https:" && !["localhost", "127.0.0.1"].includes(hostname))
    throw new Error(
      "SIMLOCK_URL must be https: the token goes with every request",
    );
  return { url, token };
}

const works = (cmd: string, args: string[]) =>
  tryCapture(cmd, args) !== undefined;

function unsupportedReason(
  target: Target,
  gateway: Gateway | undefined,
): string | undefined {
  const mac = process.platform === "darwin";
  const needs: string[] = [];
  // Without Docker, stack.sh only has Zonky's Apple-silicon Postgres.
  const zonky = mac && arch() === "arm64";
  if (target !== "checks" && !zonky && !works("docker", ["info"]))
    needs.push("Docker");
  if (target === "ios") {
    if (!mac || !works("xcrun", ["--find", "simctl"]))
      needs.push("macOS with Xcode");
    if (!works("pod", ["--version"])) needs.push("CocoaPods");
    if (!works("java", ["-version"])) needs.push("Java, for Maestro");
    if (!works("node", ["tooling/github/ios-simulator/pick.mjs", IOS_MODEL]))
      needs.push("an iOS runtime with an iPhone Pro Max");
  }
  if (target === "android") {
    if (!existsSync(adb))
      needs.push(`the Android SDK (looked in ${androidHome})`);
    if (!javaHome()) needs.push("JDK 17");
    if (!gateway) {
      if (!existsSync(emulatorBin)) needs.push("the Android emulator");
      if (!existsSync(avdmanager)) needs.push("Android cmdline-tools");
      if (!androidImage()) needs.push("a google_apis system image");
    }
  }
  return needs.length ? `needs ${needs.join(", ")}` : undefined;
}

// A run killed outright leaves its stack running; stop it before its ports
// are handed out again.
async function sweepDeadStacks(log: string): Promise<void> {
  const claims = join(cacheDir, "stack-ports");
  if (!existsSync(claims)) return;
  for (const web of readdirSync(claims)) {
    const claim = join(claims, web);
    // Read before tryLock: taking over a dead claim deletes it.
    const dirFile = join(claim, "stack-dir");
    const stackDir = existsSync(dirFile) ? readFileSync(dirFile, "utf8") : "";
    const release = tryLock(claim);
    if (typeof release === "number") continue;
    if (stackDir)
      await run("bash", [STACK, "stop"], {
        log,
        env: { ...stackPortEnv(Number(web)), STACK_DIR: stackDir },
      });
    release();
  }
}

async function timed(
  target: Target,
  log: string,
  fn: () => Promise<void>,
): Promise<Result> {
  const started = Date.now();
  const seconds = () => Math.round((Date.now() - started) / 1000);
  console.log(`▶ ${target}  (${relative(repoRoot, log)})`);
  try {
    await fn();
    console.log(`✔ ${target} passed in ${seconds()}s`);
    return { target, status: "passed", seconds: seconds(), log };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.log(`✘ ${target} failed in ${seconds()}s: ${detail}`);
    return { target, status: "failed", detail, seconds: seconds(), log };
  }
}

const cleanups: (() => Promise<unknown>)[] = [];

let cleaning: Promise<void> | undefined;

function cleanUp(): Promise<void> {
  cleaning ??= (async () => {
    for (let next = cleanups.pop(); next; next = cleanups.pop()) {
      await next().catch((error: unknown) =>
        console.error(`cleanup failed: ${String(error)}`),
      );
    }
  })();
  return cleaning;
}

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      areas: { type: "string" },
      devices: { type: "string", default: "2" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return 0;
  }
  const requested: Target[] = [];
  for (const arg of positionals) {
    const target = TARGETS.find((t) => t === arg);
    if (!target) {
      console.error(`Unknown target "${arg}"\n\n${USAGE}`);
      return 2;
    }
    requested.push(target);
  }
  const deviceCount = Number(values.devices);
  if (!Number.isInteger(deviceCount) || deviceCount < 1) {
    console.error("--devices takes a whole number of at least 1");
    return 2;
  }
  const areas = values.areas?.split(",").filter(Boolean) ?? [];
  const gateway = gatewayFromEnv();

  const results: Result[] = [];
  const targets: Target[] = [];
  for (const target of requested.length ? requested : TARGETS) {
    const reason = unsupportedReason(target, gateway);
    if (!reason) targets.push(target);
    else if (requested.length) {
      console.error(`Can't run ${target} here: it ${reason}`);
      return 2;
    } else results.push({ target, status: "skipped", detail: reason });
  }

  const unlock = tryLock(join(repoRoot, ".ci-local/lock"));
  if (typeof unlock === "number") {
    console.error(
      `Another ci:local run (pid ${unlock}) is using this worktree`,
    );
    return 2;
  }
  let interrupts = 0;
  for (const [signal, code] of [
    ["SIGINT", 130],
    ["SIGTERM", 143],
    ["SIGHUP", 129],
  ] as const) {
    process.on(signal, () => {
      // Earlier ones wait for the cleanup to release devices; a third means it.
      if (++interrupts >= 3) process.exit(code);
      console.log(`\n${signal}: cleaning up`);
      stopRunning();
      void cleanUp().finally(() => process.exit(code));
    });
  }

  const runs = join(repoRoot, ".ci-local");
  // Emulator disks are gigabytes, and a killed run leaves its own behind.
  const avdDir = join(runs, "avd");
  rmSync(avdDir, { recursive: true, force: true });
  const runDir = join(runs, new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(runDir, { recursive: true });
  const logOf = (name: string) => join(runDir, `${name}.log`);
  await sweepDeadRuns(logOf("cleanup"));
  await sweepDeadStacks(logOf("cleanup"));
  const platforms = targets.filter(
    (t): t is Platform => t === "ios" || t === "android",
  );
  const needsStack = targets.some((t) => t !== "checks");

  let stackEnv: NodeJS.ProcessEnv = {};
  let apiUrl = "";
  let stack: Promise<void> | undefined;
  if (needsStack) {
    // Derived from the worktree, so turbo's cache of the web build (which
    // hashes the auth URL) hits on the next run in the same worktree.
    const seed = Number.parseInt(
      createHash("sha256").update(repoRoot).digest("hex").slice(0, 6),
      16,
    );
    const blocks = Array.from(
      { length: 50 },
      (_, i) => 40_000 + ((seed + i) % 2000) * 4,
    );
    const ports = await claimPorts("stack-ports", blocks, 3);
    cleanups.push(async () => ports.unclaim());
    const stackDir = join(runDir, "stack");
    writeFileSync(join(ports.dir, "stack-dir"), stackDir);
    stackEnv = {
      ...parseEnv(
        capture("bash", [STACK, "env"], { env: stackPortEnv(ports.port) }),
      ),
      CI: "true",
      STACK_DIR: stackDir,
    };
    apiUrl = `http://localhost:${ports.port}`;
    cleanups.push(() =>
      run("bash", [STACK, "stop"], {
        env: stackEnv,
        log: logOf("stack"),
        cleanup: true,
      }),
    );
    stack = mustRun("bash", [STACK, "start"], {
      env: stackEnv,
      log: logOf("stack"),
    });
    // Every target that needs the stack reports its failure.
    stack.catch(() => {});
  }
  console.log(
    [
      `Running ${targets.join(", ")}${results.length ? `; skipping ${results.map((r) => `${r.target} (${r.detail})`).join(", ")}` : ""}`,
      platforms.length
        ? `Devices: ${deviceCount} per platform, ${gateway ? "leased from the Simlock gateway" : "throwaway"}`
        : "",
      needsStack ? `Stack: ${apiUrl}` : "",
      `Results: ${relative(repoRoot, runDir)}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  const toolEnv: NodeJS.ProcessEnv = {
    ANDROID_HOME: androidHome,
    JAVA_HOME: javaHome(),
    // The SDK's adb: another adb's first call would restart the shared server.
    PATH: [join(androidHome, "platform-tools"), process.env.PATH].join(":"),
  };
  // One after the other: two native builds at once starve each other.
  let previousBuild: Promise<unknown> = Promise.resolve();
  const apps = new Map<Platform, Promise<string>>();
  for (const platform of platforms) {
    const app = previousBuild.then(() =>
      buildApp(
        platform,
        join(runDir, `${platform}-app`),
        logOf(`${platform}-build`),
        toolEnv,
      ),
    );
    app.catch(() => {});
    apps.set(platform, app);
    previousBuild = app.catch(() => {});
  }

  const mobile = async (platform: Platform) => {
    const log = logOf(platform);
    const e2eDir = join(repoRoot, "apps/expo");
    await mustRun("node", ["e2e/validate-flows.mjs"], { cwd: e2eDir, log });
    const devices = await acquireDevices(deviceCount, {
      platform,
      avdDir,
      log,
      gateway,
      onCleanup: (release) => cleanups.push(release),
    });
    const app = await apps.get(platform);
    if (!app) throw new Error(`no ${platform} build`);
    await stack;
    await Promise.all(
      devices.map((device) =>
        mustRun(
          "bash",
          ["apps/expo/e2e/prepare-device.sh", platform, device, app],
          { log, env: toolEnv },
        ),
      ),
    );
    await mustRun("node", ["e2e/run-flows.mjs", ...areas], {
      cwd: e2eDir,
      log,
      env: {
        PATH: [installMaestro(), toolEnv.PATH].join(":"),
        E2E_PLATFORM: platform,
        E2E_DEVICE: devices.join(","),
        E2E_API_URL: apiUrl,
        E2E_RESULTS_DIR: join(runDir, platform),
      },
    });
  };

  const web = async () => {
    await mustRun(
      "pnpm",
      ["-F", "@flatsby/nextjs", "exec", "playwright", "install", "chromium"],
      {
        log: logOf("web"),
      },
    );
    await stack;
    // Not through turbo: its strict env mode drops PLAYWRIGHT_WORKERS.
    // Results into the run dir: a report left in apps/nextjs breaks its typecheck.
    const results = ["--output", join(runDir, "web-results")];
    await mustRun("pnpm", ["-F", "@flatsby/nextjs", "test:e2e", ...results], {
      log: logOf("web"),
      env: {
        ...stackEnv,
        BASE_URL: apiUrl,
        PLAYWRIGHT_WORKERS: "4",
        PLAYWRIGHT_HTML_OUTPUT_DIR: join(runDir, "web-report"),
      },
    });
  };

  const checks = async () => {
    const env = {
      ...parseEnv(readFileSync(join(repoRoot, ".env.example"), "utf8")),
      ...process.env,
      CI: "true",
    };
    const failed: string[] = [];
    for (const [cmd, args] of CHECKS) {
      if ((await run(cmd, args, { env, log: logOf("checks") })) !== 0)
        failed.push(`${cmd} ${args.join(" ")}`);
    }
    if (failed.length) throw new Error(failed.join(", "));
  };

  const e2e = targets.flatMap((target) => {
    if (target === "web") return [timed(target, logOf("web"), web)];
    if (target === "ios" || target === "android")
      return [timed(target, logOf(target), () => mobile(target))];
    return [];
  });
  results.push(...(await Promise.all(e2e)));
  // A target that failed early can leave its native build running.
  await Promise.allSettled(apps.values());
  await cleanUp();
  // Last, with devices and the stack gone: beside them it overloads the
  // machine, and its turbo runs would race the stack's build.
  if (targets.includes("checks"))
    results.push(await timed("checks", logOf("checks"), checks));
  unlock();

  writeFileSync(
    join(runDir, "summary.json"),
    `${JSON.stringify(results, null, 2)}\n`,
  );
  console.log("\nSummary");
  for (const result of results) {
    const time = result.seconds === undefined ? "" : ` ${result.seconds}s`;
    console.log(
      `  ${result.status.padEnd(7)} ${result.target}${time}${result.detail ? `  ${result.detail}` : ""}`,
    );
  }
  console.log(`  ${relative(repoRoot, join(runDir, "summary.json"))}`);
  return results.some((result) => result.status === "failed") ? 1 : 0;
}

process.exitCode = await main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  stopRunning();
  await cleanUp();
  return 1;
});
