#!/usr/bin/env node
/**
 * Static validation for Maestro flows. Runs anywhere Node runs (no simulator
 * needed): parses every flow/subflow YAML, checks basic Maestro structure,
 * verifies runFlow references resolve, and cross-checks every `id:` selector
 * against testIDs that actually exist in the app source.
 *
 * Usage: node e2e/validate-flows.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const YAML = require("yaml");

const e2eDir = dirname(fileURLToPath(import.meta.url));
const appSrcDir = resolve(e2eDir, "../src");
const flowsDir = join(e2eDir, "flows");
const subflowsDir = join(e2eDir, "subflows");

const errors = [];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".yaml") || entry.endsWith(".yml")) out.push(full);
  }
  return out;
}

// --- Collect testIDs from app source ------------------------------------
function collectTestIDs() {
  const ids = new Set();
  const dynamicPrefixes = new Set();
  const files = [];
  (function walkSrc(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walkSrc(full);
      else if (/\.(tsx|ts)$/.test(entry)) files.push(full);
    }
  })(appSrcDir);

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/testID=\{?["'`]([^"'`}]+)["'`]\}?/g)) {
      ids.add(m[1]);
    }
    // template-literal testIDs, e.g. testID={`foo-${bar}`}
    for (const m of src.matchAll(/testID=\{`([^`]*)\$\{[^}]+\}[^`]*`\}/g)) {
      dynamicPrefixes.add(m[1]);
    }
    // testIDs passed via props (e.g. checkboxTestID={`...`})
    for (const m of src.matchAll(/TestID=\{`([^`]*)\$\{[^}]+\}[^`]*`\}/g)) {
      dynamicPrefixes.add(m[1]);
    }
  }
  return { ids, dynamicPrefixes };
}

const { ids: knownIDs, dynamicPrefixes } = collectTestIDs();

function idExists(id) {
  if (knownIDs.has(id)) return true;
  for (const prefix of dynamicPrefixes) {
    if (prefix && id.startsWith(prefix)) return true;
  }
  return false;
}

// --- Validate flows ------------------------------------------------------
const KNOWN_COMMANDS = new Set([
  "launchApp",
  "openLink",
  "tapOn",
  "doubleTapOn",
  "longPressOn",
  "inputText",
  "eraseText",
  "pasteText",
  "copyTextFrom",
  "hideKeyboard",
  "assertVisible",
  "assertNotVisible",
  "assertTrue",
  "extendedWaitUntil",
  "waitForAnimationToEnd",
  "scroll",
  "scrollUntilVisible",
  "swipe",
  "back",
  "runFlow",
  "runScript",
  "evalScript",
  "repeat",
  "retry",
  "stopApp",
  "clearState",
  "takeScreenshot",
  "pressKey",
  "travel",
  "setLocation",
]);

function* iterateSelectors(value) {
  if (value == null) return;
  if (typeof value === "object" && !Array.isArray(value)) {
    if (typeof value.id === "string") yield value.id;
    for (const key of ["visible", "notVisible", "element", "from", "to"]) {
      if (value[key] != null) yield* iterateSelectors(value[key]);
    }
  }
}

function validateCommands(file, commands, { isSubflow }) {
  const rel = relative(e2eDir, file);
  if (!Array.isArray(commands)) {
    errors.push(`${rel}: expected a YAML list of commands`);
    return;
  }
  const BARE_COMMANDS = new Set([
    "hideKeyboard",
    "eraseText",
    "pasteText",
    "back",
    "stopApp",
    "clearState",
    "launchApp",
    "scroll",
    "waitForAnimationToEnd",
  ]);
  for (const command of commands) {
    if (command == null) {
      errors.push(`${rel}: empty list entry`);
      continue;
    }
    if (typeof command === "string") {
      if (!BARE_COMMANDS.has(command)) {
        errors.push(`${rel}: unknown bare command "${command}"`);
      }
      continue;
    }
    const keys = Object.keys(command);
    if (keys.length !== 1) {
      errors.push(
        `${rel}: command with ${keys.length} keys: ${keys.join(",")}`,
      );
      continue;
    }
    const name = keys[0];
    if (!KNOWN_COMMANDS.has(name)) {
      errors.push(`${rel}: unknown command "${name}"`);
      continue;
    }
    const value = command[name];

    if (name === "runFlow") {
      const ref = typeof value === "string" ? value : value?.file;
      const inlineCommands =
        typeof value === "object" && value !== null ? value.commands : null;
      if (Array.isArray(inlineCommands)) {
        validateCommands(file, inlineCommands, { isSubflow });
      } else if (typeof ref !== "string") {
        errors.push(`${rel}: runFlow without a file reference or commands`);
      } else {
        const target = resolve(dirname(file), ref);
        try {
          statSync(target);
        } catch {
          errors.push(`${rel}: runFlow target not found: ${ref}`);
        }
      }
    }

    if (
      (name === "repeat" || name === "retry") &&
      value != null &&
      Array.isArray(value.commands)
    ) {
      validateCommands(file, value.commands, { isSubflow });
    }

    for (const id of iterateSelectors(value)) {
      if (id.includes("${")) continue; // env-templated, checked at runtime
      if (!idExists(id)) {
        errors.push(`${rel}: id "${id}" not found as a testID in app source`);
      }
    }
  }
}

const flowFiles = walk(flowsDir).filter((f) => !f.endsWith("config.yaml"));
const subflowFiles = walk(subflowsDir);

for (const file of flowFiles) {
  const rel = relative(e2eDir, file);
  const raw = readFileSync(file, "utf8");
  const docs = YAML.parseAllDocuments(raw);
  if (docs.some((d) => d.errors.length > 0)) {
    for (const d of docs)
      for (const e of d.errors) errors.push(`${rel}: YAML error: ${e.message}`);
    continue;
  }
  if (docs.length !== 2) {
    errors.push(
      `${rel}: expected front matter + commands (2 documents), got ${docs.length}`,
    );
    continue;
  }
  const config = docs[0].toJS();
  if (!config || typeof config.appId !== "string") {
    errors.push(`${rel}: front matter missing appId`);
  } else if (config.appId !== "com.flatcove.app.v2") {
    errors.push(`${rel}: unexpected appId "${config.appId}"`);
  }
  validateCommands(file, docs[1].toJS(), { isSubflow: false });
}

for (const file of subflowFiles) {
  const rel = relative(e2eDir, file);
  const raw = readFileSync(file, "utf8");
  const docs = YAML.parseAllDocuments(raw);
  if (docs.some((d) => d.errors.length > 0)) {
    for (const d of docs)
      for (const e of d.errors) errors.push(`${rel}: YAML error: ${e.message}`);
    continue;
  }
  // Maestro requires a config section (appId + ---) in subflows too.
  if (docs.length !== 2) {
    errors.push(
      `${rel}: expected front matter + commands (2 documents), got ${docs.length}`,
    );
    continue;
  }
  const config = docs[0].toJS();
  if (!config || typeof config.appId !== "string") {
    errors.push(`${rel}: front matter missing appId`);
  }
  const commands = docs[docs.length - 1].toJS();
  validateCommands(file, commands, { isSubflow: true });
}

console.log(
  `Checked ${flowFiles.length} flows + ${subflowFiles.length} subflows against ${knownIDs.size} static testIDs (${dynamicPrefixes.size} dynamic prefixes).`,
);
if (errors.length > 0) {
  for (const e of errors) console.error(`ERROR ${e}`);
  process.exit(1);
}
console.log("All Maestro flows look structurally valid.");
