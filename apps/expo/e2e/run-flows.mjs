#!/usr/bin/env node
/**
 * CI Maestro runner: `node e2e/run-flows.mjs [dir-or-flow ...]`, no args for
 * the whole suite. Needs E2E_API_URL. E2E_PLATFORM selects the app id ("ios"
 * default, or "android"). E2E_LOCALES (e.g. "en de") runs every flow once per
 * locale, passing it as E2E_LOCALE and filing captures under
 * <results>/screenshots/<locale>/. E2E_DEVICE, comma-separated simulators or
 * emulators, is required: without it Maestro drives whatever device it finds
 * first, someone else's included. E2E_RESULTS_DIR moves the results out of
 * e2e/results.
 *
 * One maestro invocation per flow, because the XCTest driver occasionally
 * crashes mid-batch on hosted runners and a shared invocation then fails
 * every remaining flow instantly ("Unknown error" at 0s).
 */
import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const e2eDir = dirname(fileURLToPath(import.meta.url));
const flowsDir = join(e2eDir, "flows");
const resultsDir = resolve(
  process.env.E2E_RESULTS_DIR ?? join(e2eDir, "results"),
);

const MAX_RERUN_FLOWS = 5;

const devices = process.env.E2E_DEVICE?.split(",").filter(Boolean) ?? [];
if (devices.length === 0) {
  console.error(
    "E2E_DEVICE is required: the simulator UDID or emulator serial to run on, comma-separated for several",
  );
  process.exit(1);
}

const apiUrl = process.env.E2E_API_URL;
if (!apiUrl) {
  console.error("E2E_API_URL is required");
  process.exit(1);
}

// The iOS bundle id and Android package differ (see app.config.ts); flows
// reference ${APP_ID} so one suite drives both.
const APP_IDS = {
  ios: "com.flatcove.app.v2",
  android: "com.flatcove.app",
};
const platform = process.env.E2E_PLATFORM ?? "ios";
const locales = process.env.E2E_LOCALES?.split(" ").filter(Boolean) ?? [];
const appId = APP_IDS[platform];

const maestroEnv = {
  MAESTRO_CLI_NO_ANALYTICS: "1",
  MAESTRO_DRIVER_STARTUP_TIMEOUT: "240000",
  ...process.env,
};

// The emulator reaches a localhost API through adb reverse, which an adbd
// restart on a loaded machine silently drops; set it again before each flow.
const { hostname, port: apiPort } = new URL(apiUrl);
const reversePort =
  platform === "android" && ["localhost", "127.0.0.1"].includes(hostname)
    ? apiPort || "80"
    : undefined;
if (!appId) {
  console.error(
    `Unknown E2E_PLATFORM "${platform}" (expected ${Object.keys(APP_IDS).join(" or ")})`,
  );
  process.exit(1);
}

function resolveTarget(target) {
  const path = join(flowsDir, target);
  if (existsSync(path) && statSync(path).isDirectory()) {
    return readdirSync(path, { recursive: true })
      .filter((f) => /\.ya?ml$/.test(f) && basename(f) !== "config.yaml")
      .sort()
      .map((f) => join(path, f));
  }
  const file = /\.ya?ml$/.test(path) ? path : `${path}.yaml`;
  if (existsSync(file)) return [file];
  console.error(`Unknown flow area or file: ${target}`);
  process.exit(1);
}

// Maestro ≥2 saves takeScreenshot output inside the debug bundle, not the
// cwd; copy captures out before the bundle is deleted.
function collectTakeScreenshots(debugDir, locale) {
  if (!existsSync(debugDir)) return;
  const screenshotsDir = join(resultsDir, "screenshots", locale ?? "");
  for (const rel of readdirSync(debugDir, { recursive: true })) {
    if (!rel.endsWith(".png")) continue;
    if (!rel.split(sep).includes("takeScreenshot")) continue;
    const src = join(debugDir, rel);
    if (!statSync(src, { throwIfNoEntry: false })?.isFile()) continue;
    mkdirSync(screenshotsDir, { recursive: true });
    copyFileSync(src, join(screenshotsDir, basename(rel)));
  }
}

function pipeWithPrefix(stream, prefix, out) {
  createInterface({ input: stream }).on("line", (line) =>
    out.write(`${prefix}${line}\n`),
  );
}

function runFlow({ file, locale }, tag, device, reinstallDriver) {
  const name = [basename(file, ".yaml"), locale, tag]
    .filter((part) => part !== undefined)
    .join("-");
  const debugDir = join(resultsDir, `debug-${name}`);
  rmSync(debugDir, { recursive: true, force: true });
  // UDIDs are long; emulator serials are short and differ at the end.
  const label = device.length > 20 ? device.slice(0, 8) : device;
  const prefix = devices.length > 1 ? `[${label}] ` : "";
  console.log(`\n${prefix}> maestro test ${relative(e2eDir, file)}`);
  if (reversePort) {
    spawnSync("adb", [
      "-s",
      device,
      "reverse",
      `tcp:${reversePort}`,
      `tcp:${reversePort}`,
    ]);
  }
  // Maestro's launchApp stops a running app through XCTest, which sometimes
  // hangs on the pid until the device counts as unreachable.
  if (platform === "ios") {
    spawnSync("xcrun", ["simctl", "terminate", device, appId]);
  }
  const child = spawn(
    "maestro",
    [
      "test",
      "--device",
      device,
      ...(reinstallDriver ? [] : ["--no-reinstall-driver"]),
      // Maestro's random driver port is bound on the device and can collide
      // with the emulator's ephemeral ports (mobile-dev-inc/Maestro#3684).
      ...(platform === "android" ? ["--driver-host-port", "7001"] : []),
      "-e",
      `APP_ID=${appId}`,
      "-e",
      `E2E_API_URL=${apiUrl}`,
      ...(locale ? ["-e", `E2E_LOCALE=${locale}`] : []),
      "--format",
      "junit",
      "--output",
      join(resultsDir, `report-${name}.xml`),
      "--debug-output",
      debugDir,
      file,
    ],
    { env: maestroEnv, stdio: prefix ? ["ignore", "pipe", "pipe"] : "inherit" },
  );
  if (prefix) {
    pipeWithPrefix(child.stdout, prefix, process.stdout);
    pipeWithPrefix(child.stderr, prefix, process.stderr);
  }
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (status) => {
      collectTakeScreenshots(debugDir, locale);
      if (status === 0) rmSync(debugDir, { recursive: true, force: true });
      resolve(status ?? 1);
    });
  });
}

// A device that failed twice in a row while another one is still working is
// likely broken (no network, dead driver); it stops taking flows for the run.
const retired = new Set();

async function runAll(runs, tagPrefix) {
  const queue = [...runs.entries()];
  const failed = [];
  await Promise.all(
    devices
      .filter((device) => !retired.has(device))
      .map(async (device) => {
        // A driver reinstall costs 25-55s per iOS flow; only a failure can
        // leave the driver broken.
        let reinstallDriver = true;
        let failuresInARow = 0;
        for (let next = queue.shift(); next; next = queue.shift()) {
          const [i, run] = next;
          const status = await runFlow(
            run,
            `${tagPrefix}${i}`,
            device,
            reinstallDriver,
          );
          reinstallDriver = status !== 0;
          failuresInARow = status === 0 ? 0 : failuresInARow + 1;
          if (status !== 0) failed.push(run);
          if (failuresInARow >= 2 && retired.size < devices.length - 1) {
            retired.add(device);
            console.log(`\n${device} failed twice in a row; leaving it out`);
            break;
          }
        }
      }),
  );
  return failed;
}

const targets = process.argv.slice(2);
const files = (targets.length ? targets : ["."]).flatMap(resolveTarget);

mkdirSync(resultsDir, { recursive: true });

const runs = (locales.length ? locales : [undefined]).flatMap((locale) =>
  files.map((file) => ({ file, locale })),
);
const failed = await runAll(runs, "");
if (failed.length === 0) process.exit(0);

if (failed.length > MAX_RERUN_FLOWS) {
  console.error(
    `${failed.length} flows failed (> ${MAX_RERUN_FLOWS}); looks systemic, not rerunning.`,
  );
  process.exit(1);
}

const names = failed
  .map(({ file, locale }) =>
    [relative(e2eDir, file), locale].filter(Boolean).join(" "),
  )
  .join(", ");
console.log(`\nRerunning ${failed.length} flow file(s) once: ${names}`);
const stillFailing = await runAll(failed, "retry-");
if (stillFailing.length > 0) process.exit(1);
console.log("All failed flows passed on rerun.");
// A green job hides these otherwise.
if (process.env.GITHUB_ACTIONS) {
  console.log(`::warning title=Flaky e2e flows::${names}`);
}
