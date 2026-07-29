#!/usr/bin/env node
/**
 * CI Maestro runner. Runs the full flow suite once; if flows fail, reruns
 * just the failed flows a single time and passes when the rerun is green
 * (insurance against hosted-runner variance). Skips the rerun when the
 * failure looks systemic: no parseable JUnit report, or most of the suite
 * failed.
 *
 * Usage: node e2e/run-flows.mjs [area ...]
 *   area - flow directory under e2e/flows (e.g. "group shopping-list");
 *          no args runs the full suite. CI shards the suite by area so each
 *          job fits its time budget.
 * Env:
 *   E2E_API_URL           - deployment to test against (required)
 *   VERCEL_BYPASS_SECRET  - Vercel protection bypass secret (optional)
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
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

function runMaestro(targets, report, debugDir) {
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
    ...targets,
  ];
  console.log(
    `\n> maestro test ${targets.map((t) => relative(e2eDir, t)).join(" ")}`,
  );
  const result = spawnSync("maestro", args, { stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

/** JUnit testcase names are flow file names without extension. */
function failedFlowNames(reportPath) {
  if (!existsSync(reportPath)) return null;
  const xml = readFileSync(reportPath, "utf8");
  const failed = new Set();
  for (const chunk of xml.split(/(?=<testcase\b)/g)) {
    if (!chunk.startsWith("<testcase")) continue;
    const openTag = chunk.slice(0, chunk.indexOf(">") + 1);
    const name = /name="([^"]*)"/.exec(openTag)?.[1];
    if (!name) continue;
    if (
      /<(?:failure|error)\b/.test(chunk) ||
      /status="(?:FAILED|ERROR)"/.test(openTag)
    ) {
      failed.add(name);
    }
  }
  return failed;
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

/** JUnit names can collide across areas (e.g. two dashboard.yaml), so the
 * rerun map is restricted to this shard's files. */
function flowFilesByName(files) {
  const map = new Map();
  for (const file of files) {
    const name = relative(flowsDir, file)
      .split("/")
      .pop()
      .replace(/\.ya?ml$/, "");
    map.set(name, [...(map.get(name) ?? []), file]);
  }
  return map;
}

const areas = process.argv.slice(2);
const shardFiles = areas.length
  ? areas.flatMap((area) => {
      const dir = join(flowsDir, area);
      if (!existsSync(dir)) {
        console.error(`Unknown flow area: ${area}`);
        process.exit(1);
      }
      return listFlowFiles(dir);
    })
  : listFlowFiles(flowsDir);

mkdirSync(resultsDir, { recursive: true });

// The full suite runs via the flows dir (picks up config.yaml); shards pass
// explicit files since Maestro treats a bare subdirectory as its own
// workspace root.
const firstStatus = runMaestro(
  areas.length ? shardFiles : [flowsDir],
  "report.xml",
  "debug",
);
if (firstStatus === 0) process.exit(0);

const failed = failedFlowNames(join(resultsDir, "report.xml"));
if (!failed || failed.size === 0) {
  console.error(
    "Maestro failed without a parseable JUnit failure list; not rerunning.",
  );
  process.exit(firstStatus);
}
if (failed.size > MAX_RERUN_FLOWS) {
  console.error(
    `${failed.size} flows failed (> ${MAX_RERUN_FLOWS}); looks systemic, not rerunning.`,
  );
  process.exit(firstStatus);
}

// Flows sharing a file name (e.g. home/dashboard.yaml and
// shopping-list/dashboard.yaml) can't be told apart in the JUnit report, so
// all files matching a failed name rerun together.
const byName = flowFilesByName(shardFiles);
const rerunFiles = [...failed].flatMap((name) => byName.get(name) ?? []);
if (rerunFiles.length === 0) {
  console.error(
    `Could not map failed flows to files: ${[...failed].join(", ")}`,
  );
  process.exit(firstStatus);
}

console.log(
  `Rerunning ${rerunFiles.length} flow file(s) once: ${rerunFiles
    .map((f) => relative(e2eDir, f))
    .join(", ")}`,
);
// One maestro invocation per flow: a crashed driver ("Unknown error") fails
// every remaining flow in its batch instantly, so each rerun gets a fresh one.
let retryStatus = 0;
for (const [i, file] of rerunFiles.entries()) {
  const status = runMaestro(
    [file],
    `report-retry-${i}.xml`,
    `debug-retry-${i}`,
  );
  if (status !== 0) retryStatus = status;
}
if (retryStatus === 0) console.log("All failed flows passed on rerun.");
process.exit(retryStatus);
