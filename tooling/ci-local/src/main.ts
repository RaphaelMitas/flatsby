import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseArgs } from "node:util";

import type { Platform } from "./app.ts";
import type { Device } from "./devices.ts";
import { buildApp, installMaestro } from "./app.ts";
import {
  acquire,
  androidHome,
  androidImage,
  gatewayFromEnv,
  prepare,
} from "./devices.ts";
import {
  capture,
  lock,
  mustRun,
  portFree,
  repoRoot,
  run,
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

const hasDocker = () =>
  tryCapture("docker", ["info", "--format", "{{.ServerVersion}}"]) !==
  undefined;

/** Why this machine can't run a target, or undefined when it can. */
function missing(target: Target): string | undefined {
  const mac = process.platform === "darwin";
  switch (target) {
    case "checks":
      return undefined;
    case "web":
      return hasDocker() || mac ? undefined : "needs Docker";
    case "ios":
      return mac && tryCapture("xcrun", ["--find", "simctl"])
        ? undefined
        : "needs macOS with Xcode";
    case "android": {
      const needs: string[] = [];
      if (!existsSync(join(androidHome, "platform-tools/adb")))
        needs.push(`the Android SDK (looked in ${androidHome})`);
      if (!javaHome()) needs.push("JDK 17");
      if (!gatewayFromEnv()) {
        if (
          !existsSync(join(androidHome, "cmdline-tools/latest/bin/avdmanager"))
        )
          needs.push("Android cmdline-tools");
        if (!androidImage()) needs.push("a google_apis system image");
      }
      return needs.length ? `needs ${needs.join(", ")}` : undefined;
    }
  }
}

/** Ports derived from the worktree, so turbo's cache of the web build (which
 * hashes the auth URL) hits on the next run in the same worktree. */
async function stackPorts(): Promise<{
  web: number;
  pg: number;
  proxy: number;
}> {
  const seed = Number.parseInt(
    createHash("sha256").update(repoRoot).digest("hex").slice(0, 6),
    16,
  );
  for (let attempt = 0; attempt < 50; attempt++) {
    const web = 40_000 + ((seed + attempt) % 2000) * 4;
    const ports = { web, pg: web + 1, proxy: web + 2 };
    const free = await Promise.all(
      [ports.web, ports.pg, ports.proxy].map(portFree),
    );
    if (free.every(Boolean)) return ports;
  }
  throw new Error("No free ports for the stack between 40000 and 48000");
}

async function timed(
  target: Target,
  log: string | undefined,
  fn: () => Promise<void>,
): Promise<Result> {
  const started = Date.now();
  const seconds = () => Math.round((Date.now() - started) / 1000);
  console.log(`▶ ${target}${log ? `  (${relative(repoRoot, log)})` : ""}`);
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

async function cleanUp(): Promise<void> {
  for (let next = cleanups.pop(); next; next = cleanups.pop()) {
    await next().catch((error: unknown) =>
      console.error(`cleanup failed: ${String(error)}`),
    );
  }
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

  const results: Result[] = [];
  const targets: Target[] = [];
  for (const target of requested.length ? requested : TARGETS) {
    const reason = missing(target);
    if (!reason) targets.push(target);
    else if (requested.length) {
      console.error(`Can't run ${target} here: it ${reason}`);
      return 2;
    } else results.push({ target, status: "skipped", detail: reason });
  }

  mkdirSync(join(repoRoot, ".ci-local"), { recursive: true });
  const unlock = await lock(join(repoRoot, ".ci-local/lock"), false);
  if (typeof unlock === "number") {
    console.error(
      `Another ci:local run (pid ${unlock}) is using this worktree`,
    );
    return 2;
  }
  cleanups.push(async () => unlock());
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      console.log(`\n${signal}: cleaning up`);
      void cleanUp().finally(() => process.exit(130));
    });
  }

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = join(repoRoot, ".ci-local", runId);
  mkdirSync(runDir, { recursive: true });
  const logOf = (name: string) => join(runDir, `${name}.log`);
  const platforms = targets.filter(
    (t): t is Platform => t === "ios" || t === "android",
  );
  const needsStack = targets.some((t) => t !== "checks");

  const ports = await stackPorts();
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
  const gateway = gatewayFromEnv();
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
  // One after the other: both bundle with Metro, which shares its cache.
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
  const maestro = platforms.length
    ? installMaestro(logOf("maestro-install"))
    : undefined;
  maestro?.catch(() => {});

  const mobile = async (platform: Platform) => {
    const log = logOf(platform);
    const devices: Device[] = [];
    cleanups.push(() => Promise.all(devices.map((device) => device.release())));
    const name = (i: number) => `ci-local-${runId}-${platform}-${i}`;
    // A gateway holds one waiting request per token and platform.
    if (gateway) {
      for (let i = 1; i <= deviceCount; i++)
        devices.push(await acquire(platform, name(i), runDir, log));
    } else {
      await Promise.all(
        Array.from({ length: deviceCount }, async (_, i) => {
          devices.push(await acquire(platform, name(i + 1), runDir, log));
        }),
      );
    }
    const app = await apps.get(platform);
    if (!app) throw new Error(`no ${platform} build`);
    await stack;
    await Promise.all(
      devices.map((device) => prepare(platform, device, app, ports.web, log)),
    );
    const maestroBin = await maestro;
    await mustRun("node", ["e2e/run-flows.mjs", ...areas], {
      cwd: join(repoRoot, "apps/expo"),
      log,
      env: {
        PATH: `${maestroBin}:${process.env.PATH}`,
        MAESTRO_CLI_NO_ANALYTICS: "1",
        MAESTRO_DRIVER_STARTUP_TIMEOUT: "240000",
        E2E_PLATFORM: platform,
        E2E_DEVICE: devices.map((device) => device.id).join(","),
        E2E_API_URL: apiUrl,
        E2E_RESULTS_DIR: join(runDir, platform),
      },
    });
  };

  const tasks = targets.map((target): Promise<Result> => {
    if (target === "checks")
      return timed(target, logOf("checks"), async () => {
        // Two turbo runs at once race on the packages' dist folders.
        await stack?.catch(() => {});
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
      });
    if (target === "web")
      return timed(target, logOf("web"), async () => {
        await stack;
        await mustRun(
          "pnpm",
          ["turbo", "run", "test:e2e", "--filter=@flatsby/nextjs"],
          {
            log: logOf("web"),
            env: { ...stackEnv, BASE_URL: apiUrl, PLAYWRIGHT_WORKERS: "4" },
          },
        );
      });
    return timed(target, logOf(target), () => mobile(target));
  });
  results.push(...(await Promise.all(tasks)));
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
  await cleanUp();
  return 1;
});
