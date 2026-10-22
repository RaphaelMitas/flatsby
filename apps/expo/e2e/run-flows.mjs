#!/usr/bin/env node
/**
 * CI Maestro runner: `node e2e/run-flows.mjs [dir-or-flow ...]`, no args for
 * the whole suite. Needs E2E_API_URL. E2E_PLATFORM selects the app id ("ios"
 * default, or "android"). E2E_LOCALES (e.g. "en de") runs every flow once per
 * locale, passing it as E2E_LOCALE and filing captures under
 * e2e/results/screenshots/<locale>/. E2E_DEVICE pins a simulator or emulator
 * when several are running.
 *
 * One maestro invocation per flow, because the XCTest driver occasionally
 * crashes mid-batch on hosted runners and a shared invocation then fails
 * every remaining flow instantly ("Unknown error" at 0s).
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const e2eDir = dirname(fileURLToPath(import.meta.url));
const flowsDir = join(e2eDir, "flows");
const resultsDir = join(e2eDir, "results");

const MAX_RERUN_FLOWS = 5;

// Reinstalling the XCTest driver costs iOS 25-55s per flow; a failure might
// have left it broken, so only then does the next flow reinstall it.
let reinstallDriver = true;

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

function runFlow({ file, locale }, index) {
  const tag = [basename(file, ".yaml"), locale, index]
    .filter((part) => part !== undefined)
    .join("-");
  const debugDir = join(resultsDir, `debug-${tag}`);
  rmSync(debugDir, { recursive: true, force: true });
  console.log(`\n> maestro test ${relative(e2eDir, file)}`);
  const { status, error } = spawnSync(
    "maestro",
    [
      "test",
      ...(process.env.E2E_DEVICE ? ["--device", process.env.E2E_DEVICE] : []),
      ...(reinstallDriver ? [] : ["--no-reinstall-driver"]),
      "-e",
      `APP_ID=${appId}`,
      "-e",
      `E2E_API_URL=${apiUrl}`,
      ...(locale ? ["-e", `E2E_LOCALE=${locale}`] : []),
      "--format",
      "junit",
      "--output",
      join(resultsDir, `report-${tag}.xml`),
      "--debug-output",
      debugDir,
      file,
    ],
    { stdio: "inherit" },
  );
  if (error) throw error;
  reinstallDriver = status !== 0;
  collectTakeScreenshots(debugDir, locale);
  // Step screenshots and hierarchy dumps are only worth keeping for failures.
  if (status === 0) rmSync(debugDir, { recursive: true, force: true });
  return status ?? 1;
}

const targets = process.argv.slice(2);
const files = (targets.length ? targets : ["."]).flatMap(resolveTarget);

mkdirSync(resultsDir, { recursive: true });

const runs = (locales.length ? locales : [undefined]).flatMap((locale) =>
  files.map((file) => ({ file, locale })),
);
const failed = [];
for (const [i, run] of runs.entries()) {
  if (runFlow(run, i) !== 0) failed.push(run);
}
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
const stillFailing = [];
for (const [i, run] of failed.entries()) {
  if (runFlow(run, `retry-${i}`) !== 0) stillFailing.push(run);
}
if (stillFailing.length > 0) process.exit(1);
console.log("All failed flows passed on rerun.");
