import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { parseArgs } from "node:util";

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
  sweepDeadRuns,
} from "./devices.ts";
import {
  cacheDir,
  capture,
  lock,
  mustRun,
  portFree,
  repoRoot,
  run,
  stopRunning,
  tryCapture,
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

function parseEnv(text: string): Record<string, string> {
  return Object.fromEntries(
    text
      .split("\n")
      .filter((line) => /^[A-Z_][A-Z0-9_]*=/.test(line))
      .map((line) => {
        const at = line.indexOf("=");
        return [line.slice(0, at), line.slice(at + 1)];
      }),
  );
}

function javaHome(): string | undefined {
  if (process.platform === "darwin") {
    const home = tryCapture("/usr/libexec/java_home", ["-v", "17"]);
    if (home) return home;
  }
  return process.env.JAVA_HOME;
}

/** Read once and taken out of the environment, so no child process sees the token. */
function gatewayFromEnv(): Gateway | undefined {
  const url = process.env.SIMLOCK_URL?.replace(/\/$/, "");
  const token = process.env.SIMLOCK_TOKEN;
  delete process.env.SIMLOCK_TOKEN;
  if (!url) return undefined;
  if (!token) throw new Error("SIMLOCK_URL is set but SIMLOCK_TOKEN is not");
  const { protocol, hostname } = new URL(url);
  if (protocol !== "https:" && !["localhost", "127.0.0.1"].includes(hostname))
    throw new Error(
      "SIMLOCK_URL must be https: the token goes with every request",
    );
  return { url, token };
}

const has = (cmd: string) =>
  tryCapture("sh", ["-c", `command -v ${cmd}`]) !== undefined;

function unsupportedReason(
  target: Target,
  gateway: Gateway | undefined,
): string | undefined {
  const mac = process.platform === "darwin";
  const needs: string[] = [];
  if (target === "web" && !mac && !tryCapture("docker", ["info"]))
    needs.push("Docker");
  if (target === "ios") {
    if (!mac || !tryCapture("xcrun", ["--find", "simctl"]))
      needs.push("macOS with Xcode");
    if (!has("pod")) needs.push("CocoaPods");
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

/** Ports derived from the worktree, so turbo's cache of the web build (which
 * hashes the auth URL) hits on the next run in the same worktree. */
async function claimStackPorts(): Promise<{
  web: number;
  pg: number;
  proxy: number;
  unclaim: () => void;
}> {
  const seed = Number.parseInt(
    createHash("sha256").update(repoRoot).digest("hex").slice(0, 6),
    16,
  );
  for (let attempt = 0; attempt < 50; attempt++) {
    const web = 40_000 + ((seed + attempt) % 2000) * 4;
    const claim = await lock(join(cacheDir, "stack-ports", String(web)), false);
    if (typeof claim === "number") continue;
    const free = await Promise.all([web, web + 1, web + 2].map(portFree));
    if (free.every(Boolean))
      return { web, pg: web + 1, proxy: web + 2, unclaim: claim };
    claim();
  }
  throw new Error("No free ports for the stack between 40000 and 48000");
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

  const unlock = await lock(join(repoRoot, ".ci-local/lock"), false);
  if (typeof unlock === "number") {
    console.error(
      `Another ci:local run (pid ${unlock}) is using this worktree`,
    );
    return 2;
  }
  cleanups.push(async () => unlock());
  for (const [signal, code] of [
    ["SIGINT", 130],
    ["SIGTERM", 143],
    ["SIGHUP", 129],
  ] as const) {
    process.once(signal, () => {
      console.log(`\n${signal}: cleaning up`);
      // Mid-cleanup, the running commands are the cleanup's own.
      if (!cleaning) stopRunning();
      void cleanUp().finally(() => process.exit(code));
    });
  }

  const runs = join(repoRoot, ".ci-local");
  // Earlier runs' emulator disks are gigabytes; their results stay.
  for (const entry of readdirSync(runs, { withFileTypes: true }))
    if (entry.isDirectory())
      for (const avd of readdirSync(join(runs, entry.name)))
        if (avd.startsWith("avd-"))
          rmSync(join(runs, entry.name, avd), { recursive: true, force: true });
  const runDir = join(runs, new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(runDir, { recursive: true });
  const logOf = (name: string) => join(runDir, `${name}.log`);
  await sweepDeadRuns(logOf("cleanup"));
  const platforms = targets.filter(
    (t): t is Platform => t === "ios" || t === "android",
  );
  const needsStack = targets.some((t) => t !== "checks");

  const ports = await claimStackPorts();
  cleanups.push(async () => ports.unclaim());
  const stackEnv: NodeJS.ProcessEnv = {
    ...parseEnv(
      capture("bash", [STACK, "env"], {
        env: {
          PORT: String(ports.web),
          PG_PORT: String(ports.pg),
          DB_WSPROXY_PORT: String(ports.proxy),
        },
      }),
    ),
    CI: "true",
    STACK_DIR: join(runDir, "stack"),
  };
  const apiUrl = `http://localhost:${ports.web}`;
  console.log(
    [
      `Running ${targets.join(", ")}${results.length ? `; skipping ${results.map((r) => `${r.target} (${r.detail})`).join(", ")}` : ""}`,
      platforms.length
        ? `Devices: ${deviceCount} per platform, ${gateway ? `leased from ${gateway.url}` : "throwaway"}`
        : "",
      needsStack ? `Stack: ${apiUrl}` : "",
      `Results: ${relative(repoRoot, runDir)}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  let stack: Promise<void> | undefined;
  if (needsStack) {
    cleanups.push(() =>
      run("bash", [STACK, "stop"], { env: stackEnv, log: logOf("stack") }),
    );
    stack = mustRun("bash", [STACK, "start"], {
      env: stackEnv,
      log: logOf("stack"),
    });
    // Every target that needs the stack reports its failure.
    stack.catch(() => {});
  }

  const toolEnv: NodeJS.ProcessEnv = {
    ANDROID_HOME: androidHome,
    JAVA_HOME: javaHome(),
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
      dir: runDir,
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
          { log },
        ),
      ),
    );
    await mustRun("node", ["e2e/run-flows.mjs", ...areas], {
      cwd: e2eDir,
      log,
      env: {
        PATH: [
          installMaestro(),
          join(androidHome, "platform-tools"),
          process.env.PATH,
        ].join(":"),
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
    await mustRun("pnpm", ["-F", "@flatsby/nextjs", "test:e2e"], {
      log: logOf("web"),
      env: { ...stackEnv, BASE_URL: apiUrl, PLAYWRIGHT_WORKERS: "4" },
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
  // Last: next to booting devices and a native build it overloads the machine,
  // and its turbo runs would race the stack's build.
  if (targets.includes("checks"))
    results.push(await timed("checks", logOf("checks"), checks));
  await cleanUp();

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
