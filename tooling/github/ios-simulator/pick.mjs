#!/usr/bin/env node
/**
 * Prints the newest device type matching a regex on the newest runtime that
 * has one, as three lines: device type id, runtime id, device name.
 *
 *   node pick.mjs "^iPhone [0-9]+ Pro Max$"
 */
import { execFileSync } from "node:child_process";

const pattern = new RegExp(process.argv[2] ?? "");
const { runtimes } = JSON.parse(
  execFileSync("xcrun", ["simctl", "list", "runtimes", "available", "--json"], {
    encoding: "utf8",
  }),
);

const compareVersions = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const newest = runtimes
  .filter((runtime) => runtime.platform === "iOS")
  .flatMap((runtime) =>
    runtime.supportedDeviceTypes
      .filter((type) => pattern.test(type.name))
      .map((type) => ({
        type: type.identifier,
        runtime: runtime.identifier,
        name: type.name,
        version: runtime.version.split(".").map(Number),
        number: Number(/\d+/.exec(type.name)?.[0] ?? 0),
      })),
  )
  .sort((a, b) => compareVersions(a.version, b.version) || a.number - b.number)
  .at(-1);

if (!newest) {
  console.error(`No simulator matching ${pattern} on an installed iOS runtime`);
  process.exit(1);
}
console.log([newest.type, newest.runtime, newest.name].join("\n"));
