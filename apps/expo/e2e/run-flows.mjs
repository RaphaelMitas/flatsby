#!/usr/bin/env node
/**
 * CI Maestro runner: `node e2e/run-flows.mjs [dir-or-flow ...]`, no args for
 * the whole suite. Needs E2E_API_URL, optionally VERCEL_BYPASS_SECRET.
 * E2E_PLATFORM selects the app id ("ios" default, or "android").
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
// cwd; copy captures to e2e/results/screenshots/ before the bundle is deleted.
function collectTakeScreenshots(debugDir) {
  if (!existsSync(debugDir)) return;
  const screenshotsDir = join(resultsDir, "screenshots");
  for (const rel of readdirSync(debugDir, { recursive: true })) {
    if (!rel.endsWith(".png")) continue;
    if (!rel.split(sep).includes("takeScreenshot")) continue;
    const src = join(debugDir, rel);
    if (!statSync(src, { throwIfNoEntry: false })?.isFile()) continue;
    mkdirSync(screenshotsDir, { recursive: true });
    copyFileSync(src, join(screenshotsDir, basename(rel)));
  }
}

function runFlow(file, tag) {
  const debugDir = join(resultsDir, `debug-${tag}`);
  console.log(`\n> maestro test ${relative(e2eDir, file)}`);
  const { status, error } = spawnSync(
    "maestro",
    [
      "test",
      "-e",
      `APP_ID=${appId}`,
      "-e",
      `E2E_API_URL=${apiUrl}`,
      "-e",
      `VERCEL_BYPASS_SECRET=${process.env.VERCEL_BYPASS_SECRET ?? ""}`,
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
  collectTakeScreenshots(debugDir);
  // Step screenshots and hierarchy dumps are only worth keeping for failures.
  if (status === 0) rmSync(debugDir, { recursive: true, force: true });
  return status ?? 1;
}

// Otherwise the first flow pays the cold Vercel function + DB inside its own
// waits, the main source of first-attempt flakes. Each route is its own
// Vercel function, so the tRPC route the flows' mutations go through needs
// warming separately from the e2e session route (any response status warms).
async function warmUpApi() {
  const base = apiUrl.replace(/\/+$/, "");
  const headers = {
    "x-vercel-protection-bypass": process.env.VERCEL_BYPASS_SECRET ?? "",
  };
  const warm = async (label, path, init) => {
    const started = Date.now();
    try {
      const res = await fetch(base + path, {
        ...init,
        headers,
        signal: AbortSignal.timeout(60000),
      });
      console.log(
        `API warm-up (${label}): HTTP ${res.status} in ${Date.now() - started}ms`,
      );
    } catch (error) {
      console.warn(
        `API warm-up (${label}) failed after ${Date.now() - started}ms:`,
        error,
      );
    }
  };
  await Promise.all([
    warm("create-session", "/api/e2e/create-session", { method: "POST" }),
    warm("trpc", "/api/trpc/user.getCurrentUser"),
  ]);
}

const targets = process.argv.slice(2);
const files = (targets.length ? targets : ["."]).flatMap(resolveTarget);

mkdirSync(resultsDir, { recursive: true });
await warmUpApi();

const failed = files.filter((file, i) => runFlow(file, i) !== 0);
if (failed.length === 0) process.exit(0);

if (failed.length > MAX_RERUN_FLOWS) {
  console.error(
    `${failed.length} flows failed (> ${MAX_RERUN_FLOWS}); looks systemic, not rerunning.`,
  );
  process.exit(1);
}

const names = failed.map((f) => relative(e2eDir, f)).join(", ");
console.log(`\nRerunning ${failed.length} flow file(s) once: ${names}`);
const stillFailing = failed.filter(
  (file, i) => runFlow(file, `retry-${i}`) !== 0,
);
if (stillFailing.length > 0) process.exit(1);
console.log("All failed flows passed on rerun.");
