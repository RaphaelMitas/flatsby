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
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
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

function runMaestro(target, report, debugDir) {
  const args = [
    "test",
    "-e",
    `E2E_API_URL=${apiUrl}`,
    "-e",
    `VERCEL_BYPASS_SECRET=${process.env.VERCEL_BYPASS_SECRET ?? ""}`,
    "--format",
    "junit",
    "--output",
    join(resultsDir, report),
    "--debug-output",
    join(resultsDir, debugDir),
    target,
  ];
  console.log(`\n> maestro test ${relative(e2eDir, target)}`);
  const result = spawnSync("maestro", args, { stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function listFlowFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listFlowFiles(full));
    } else if (/\.ya?ml$/.test(entry) && entry !== "config.yaml") {
      files.push(full);
    }
  }
  return files;
}

const areas = process.argv.slice(2);
const shardFiles = areas.length
  ? areas.flatMap((area) => {
      const target = join(flowsDir, area);
      if (existsSync(target) && statSync(target).isDirectory()) {
        return listFlowFiles(target);
      }
      const file = /\.ya?ml$/.test(target) ? target : `${target}.yaml`;
      if (existsSync(file)) return [file];
      console.error(`Unknown flow area or file: ${area}`);
      process.exit(1);
    })
  : listFlowFiles(flowsDir);

mkdirSync(resultsDir, { recursive: true });

// Each shard's first flow otherwise pays the cold Vercel function + DB
// connection on create-session inside its login wait, which is the main
// source of first-attempt bootstrap flakes.
async function warmUpApi() {
  const url = `${apiUrl.replace(/\/+$/, "")}/api/e2e/create-session`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-vercel-protection-bypass": process.env.VERCEL_BYPASS_SECRET ?? "",
      },
      signal: AbortSignal.timeout(60000),
    });
    console.log(`API warm-up: HTTP ${res.status} in ${Date.now() - started}ms`);
  } catch (error) {
    console.warn(`API warm-up failed after ${Date.now() - started}ms:`, error);
  }
}
await warmUpApi();

const failed = [];
for (const [i, file] of shardFiles.entries()) {
  const status = runMaestro(file, `report-${i}.xml`, `debug-${i}`);
  if (status !== 0) failed.push(file);
}
if (failed.length === 0) process.exit(0);

if (failed.length > MAX_RERUN_FLOWS) {
  console.error(
    `${failed.length} flows failed (> ${MAX_RERUN_FLOWS}); looks systemic, not rerunning.`,
  );
  process.exit(1);
}

console.log(
  `\nRerunning ${failed.length} flow file(s) once: ${failed
    .map((f) => relative(e2eDir, f))
    .join(", ")}`,
);
let retryStatus = 0;
for (const [i, file] of failed.entries()) {
  const status = runMaestro(file, `report-retry-${i}.xml`, `debug-retry-${i}`);
  if (status !== 0) retryStatus = status;
}
if (retryStatus === 0) console.log("All failed flows passed on rerun.");
process.exit(retryStatus);
