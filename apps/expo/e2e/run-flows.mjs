#!/usr/bin/env node
/**
 * CI Maestro runner. Runs every flow in its own maestro invocation — the
 * XCTest driver occasionally crashes mid-batch on hosted runners, and in a
 * shared invocation that fails every remaining flow instantly ("Unknown
 * error" at 0s). Per-flow invocations cap a driver crash at one flow, one
 * attempt. Failed flows are rerun once (fresh driver) and the run passes
 * when the rerun is green; a mostly-failing shard skips reruns as systemic.
 *
 * Usage: node e2e/run-flows.mjs [target ...]
 *   target - flow directory or single flow under e2e/flows (e.g. "group" or
 *            "expenses/splits"); no args runs the full suite. CI shards the
 *            suite so each job fits its time budget.
 * Env:
 *   E2E_API_URL           - deployment to test against (required)
 *   VERCEL_BYPASS_SECRET  - Vercel protection bypass secret (optional)
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
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

function runFlow(file, tag) {
  const debugDir = join(resultsDir, `debug-${tag}`);
  console.log(`\n> maestro test ${relative(e2eDir, file)}`);
  const { status, error } = spawnSync(
    "maestro",
    [
      "test",
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
  // Screenshots and hierarchy dumps are only worth keeping for failures —
  // uploading them for every flow made the results artifact ~10x bigger.
  if (status === 0) rmSync(debugDir, { recursive: true, force: true });
  return status ?? 1;
}

// Without this the shard's first flow pays the cold Vercel function + DB
// connection on create-session inside its login wait, which is the main
// source of first-attempt bootstrap flakes.
async function warmUpApi() {
  const started = Date.now();
  try {
    const res = await fetch(
      `${apiUrl.replace(/\/+$/, "")}/api/e2e/create-session`,
      {
        method: "POST",
        headers: {
          "x-vercel-protection-bypass": process.env.VERCEL_BYPASS_SECRET ?? "",
        },
        signal: AbortSignal.timeout(60000),
      },
    );
    console.log(`API warm-up: HTTP ${res.status} in ${Date.now() - started}ms`);
  } catch (error) {
    console.warn(`API warm-up failed after ${Date.now() - started}ms:`, error);
  }
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
