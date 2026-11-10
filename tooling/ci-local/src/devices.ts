import { spawn } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  openSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ChildProcess } from "node:child_process";
import { z } from "zod/v4";

import type { Platform } from "./app.ts";
import { localAndroidAbi } from "./app.ts";
import {
  alive,
  cacheDir,
  capture,
  lock,
  mustRun,
  portFree,
  run,
  sleep,
  tryCapture,
} from "./run.ts";

export interface Gateway {
  url: string;
  token: string;
}

export interface DeviceContext {
  platform: Platform;
  dir: string;
  log: string;
  gateway: Gateway | undefined;
  /** Registered as soon as a device exists, before it is ready. */
  onCleanup: (release: () => Promise<unknown>) => void;
}

export const androidHome =
  process.env.ANDROID_HOME ??
  process.env.ANDROID_SDK_ROOT ??
  join(
    homedir(),
    process.platform === "darwin" ? "Library/Android/sdk" : "Android/Sdk",
  );
export const adb = join(androidHome, "platform-tools/adb");
export const emulatorBin = join(androidHome, "emulator/emulator");
export const avdmanager = join(
  androidHome,
  "cmdline-tools/latest/bin/avdmanager",
);

// CI's models: e2e.yml's simulator and android-emulator-runner's profile.
const IOS_MODEL = "^iPhone [0-9]+ Pro Max$";
const ANDROID_MODEL = "Pixel 7";
const BOOT_TIMEOUT_MS = 5 * 60_000;

const note = (log: string, line: string) => appendFileSync(log, `${line}\n`);

function iosModel(): { type: string; runtime: string; name: string } {
  const [type, runtime, name] = capture("node", [
    "tooling/github/ios-simulator/pick.mjs",
    IOS_MODEL,
  ]).split("\n");
  if (!type || !runtime || !name) throw new Error("pick.mjs printed no model");
  return { type, runtime, name };
}

export function androidImage(): string | undefined {
  const images = join(androidHome, "system-images");
  if (!existsSync(images)) return undefined;
  // Numbered levels only: a preview such as android-Tiramisu won't boot the app.
  const level = (api: string) =>
    Number(/^android-(\d+(?:\.\d+)?)$/.exec(api)?.[1]);
  const apis = readdirSync(images)
    .filter(
      (api) =>
        level(api) &&
        existsSync(join(images, api, "google_apis", localAndroidAbi)),
    )
    .sort((a, b) => level(a) - level(b));
  // CI runs API 34.
  const api = apis.includes("android-34") ? "android-34" : apis.at(-1);
  return api && `system-images;${api};google_apis;${localAndroidAbi}`;
}

async function throwawaySimulator(
  name: string,
  ctx: DeviceContext,
): Promise<string> {
  const model = iosModel();
  const udid = capture("xcrun", [
    "simctl",
    "create",
    name,
    model.type,
    model.runtime,
  ]);
  ctx.onCleanup(async () => {
    await run("xcrun", ["simctl", "shutdown", udid], { log: ctx.log });
    await run("xcrun", ["simctl", "delete", udid], { log: ctx.log });
  });
  await mustRun("xcrun", ["simctl", "boot", udid], { log: ctx.log });
  await mustRun("xcrun", ["simctl", "bootstatus", udid], { log: ctx.log });
  return udid;
}

// Locked per port so two runs never drive one emulator; 5560-5584 sits in
// the range the default adb server scans.
async function claimEmulatorPort(): Promise<{
  port: number;
  unclaim: () => void;
}> {
  for (let port = 5560; port <= 5584; port += 2) {
    const claim = await lock(
      join(cacheDir, "emulator-ports", String(port)),
      false,
    );
    if (typeof claim === "number") continue;
    if ((await portFree(port)) && (await portFree(port + 1)))
      return { port, unclaim: claim };
    claim();
  }
  throw new Error("No free emulator port between 5560 and 5585");
}

async function throwawayEmulator(
  name: string,
  ctx: DeviceContext,
): Promise<string> {
  const image = androidImage();
  if (!image)
    throw new Error(
      `No google_apis ${localAndroidAbi} system image in ${androidHome}`,
    );
  // Its own AVD home keeps the AVD out of Android Studio's list.
  const avdHome = join(ctx.dir, `avd-${name}`);
  const { port, unclaim } = await claimEmulatorPort();
  const serial = `emulator-${port}`;
  let emulator: ChildProcess | undefined;
  let exited = Promise.resolve();
  ctx.onCleanup(async () => {
    if (emulator?.pid && emulator.exitCode === null) {
      process.kill(-emulator.pid, "SIGTERM");
      await Promise.race([exited, sleep(30_000)]);
      if (emulator.exitCode === null) process.kill(-emulator.pid, "SIGKILL");
    }
    rmSync(avdHome, { recursive: true, force: true });
    unclaim();
  });

  await mustRun(
    avdmanager,
    [
      "create",
      "avd",
      "--name",
      name,
      "--package",
      image,
      "--device",
      "pixel_7",
      "--force",
    ],
    { log: ctx.log, env: { ANDROID_AVD_HOME: avdHome }, input: "no\n" },
  );
  const out = openSync(ctx.log, "a");
  const child = spawn(
    emulatorBin,
    [
      "-avd",
      name,
      "-port",
      String(port),
      "-no-window",
      "-no-snapshot",
      "-no-audio",
      "-no-boot-anim",
    ],
    {
      env: { ...process.env, ANDROID_AVD_HOME: avdHome },
      stdio: ["ignore", out, out],
      detached: true,
    },
  );
  emulator = child;
  let failed: string | undefined;
  exited = new Promise((done) => {
    child.once("exit", () => done());
    child.once("error", (error) => {
      failed = error.message;
      done();
    });
  });
  child.unref();

  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (failed || child.exitCode !== null)
      throw new Error(
        `${name} stopped while booting${failed ? `: ${failed}` : ""}, see ${ctx.log}`,
      );
    if (
      tryCapture(adb, [
        "-s",
        serial,
        "shell",
        "getprop",
        "sys.boot_completed",
      ]) === "1"
    ) {
      const avd = tryCapture(adb, ["-s", serial, "emu", "avd", "name"]);
      if (avd?.split("\n")[0]?.trim() !== name)
        throw new Error(`${serial} is not this run's emulator`);
      return serial;
    }
    await sleep(3000);
  }
  throw new Error(`${name} did not finish booting in 5 minutes`);
}

const SimlockError = z.object({ code: z.string(), message: z.string() });
const Lease = z.object({
  id: z.string(),
  udid: z.string(),
  address: z.string(),
  ttlMs: z.number(),
  worker: z.object({ label: z.string() }).partial().optional(),
});
const LeaseRequest = z.object({
  request: z
    .object({
      id: z.string(),
      state: z.string(),
      lease: Lease.optional(),
      error: SimlockError.optional(),
    })
    .optional(),
  error: SimlockError.optional(),
});

async function leaseDevice(
  ctx: DeviceContext,
  gateway: Gateway,
  held: number,
): Promise<string> {
  const api = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${gateway.url}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${gateway.token}`,
        "Content-Type": "application/json",
      },
    });
    const text = await response.text();
    return LeaseRequest.parse(text ? JSON.parse(text) : {});
  };
  const body =
    ctx.platform === "ios"
      ? { platform: ctx.platform, device: iosModel().name }
      : {
          platform: ctx.platform,
          device: ANDROID_MODEL,
          imageTag: "google_apis",
        };

  let requestId: string | undefined;
  let lease: z.infer<typeof Lease> | undefined;
  let renew: NodeJS.Timeout | undefined;
  ctx.onCleanup(async () => {
    clearInterval(renew);
    if (lease) await api(`/v1/leases/${lease.id}`, { method: "DELETE" });
    else if (requestId)
      await api(`/v1/lease-requests/${requestId}`, { method: "DELETE" });
  });

  const waitUntil = Date.now() + 30 * 60_000;
  while (!lease) {
    const created = await api("/v1/lease-requests", {
      method: "POST",
      body: JSON.stringify({ ...body, ttlMs: 15 * 60_000 }),
    });
    if (created.error?.code === "REQUESTER_ALREADY_LEASED") {
      if (held > 0)
        throw new Error(
          `The gateway lets this token hold ${held} ${ctx.platform} lease(s); raise its lease.maxPerRequester or pass --devices ${held}`,
        );
      if (Date.now() > waitUntil)
        throw new Error(
          "Another run on this token kept its lease request for 30 minutes",
        );
      note(ctx.log, "Another run on this token is waiting; retrying in 10s");
      await sleep(10_000);
      continue;
    }
    let request = created.request;
    if (!request)
      throw new Error(
        `Lease request refused: ${created.error?.message ?? "no answer"}`,
      );
    requestId = request.id;
    while (request.state !== "granted") {
      if (request.state === "failed" || request.state === "cancelled")
        throw new Error(
          `Lease ${request.state}: ${request.error?.message ?? ""}`,
        );
      const polled = await api(`/v1/lease-requests/${request.id}?wait=60`);
      if (!polled.request)
        throw new Error(`Lease request ${request.id} vanished`);
      request = polled.request;
    }
    lease = request.lease;
  }
  const leaseId = lease.id;
  renew = setInterval(() => {
    api(`/v1/leases/${leaseId}/renew`, { method: "POST" }).catch(() => {});
  }, lease.ttlMs / 3);
  renew.unref();

  // Maestro runs here, so the device has to be on this machine.
  const elsewhere = new Error(
    `Leased a device on worker ${lease.worker?.label ?? "?"}, but ci:local only drives devices on this machine`,
  );
  if (ctx.platform === "ios") {
    if (!capture("xcrun", ["simctl", "list", "devices"]).includes(lease.udid))
      throw elsewhere;
    return lease.udid;
  }
  // Simlock's emulators sit on Simlock's own adb server, and Maestro only
  // talks to the default one: attach through the emulator's adb port.
  const serial = `127.0.0.1:${Number(lease.address.replace("emulator-", "")) + 1}`;
  ctx.onCleanup(() => run(adb, ["disconnect", serial], { log: ctx.log }));
  await run(adb, ["connect", serial], { log: ctx.log });
  // Another worker's emulator can have the same port as one on this machine.
  if (
    tryCapture(adb, [
      "-s",
      serial,
      "shell",
      "getprop",
      "ro.boot.qemu.avd_name",
    ]) !== lease.udid
  )
    throw elsewhere;
  return serial;
}

export async function acquireDevices(
  count: number,
  ctx: DeviceContext,
): Promise<string[]> {
  const { gateway } = ctx;
  if (gateway) {
    // A token may wait on one request per platform, so lease in turn.
    const ids: string[] = [];
    for (let held = 0; held < count; held++)
      ids.push(await leaseDevice(ctx, gateway, held));
    return ids;
  }
  const make = ctx.platform === "ios" ? throwawaySimulator : throwawayEmulator;
  return Promise.all(
    Array.from({ length: count }, (_, i) =>
      make(`ci-local-${process.pid}-${ctx.platform}-${i + 1}`, ctx),
    ),
  );
}

// Throwaway devices carry their run's pid: a run killed mid-cleanup leaves
// them behind, and the next run deletes the ones whose run is gone.
export async function sweepDeadRuns(log: string): Promise<void> {
  const dead = (pid: string | undefined) =>
    pid !== undefined && !alive(Number(pid));
  if (process.platform === "darwin") {
    for (const line of capture("xcrun", ["simctl", "list", "devices"]).split(
      "\n",
    )) {
      const [, pid, udid] =
        /ci-local-(\d+)-\S+ \(([0-9A-F-]{36})\)/.exec(line) ?? [];
      if (!udid || !dead(pid)) continue;
      await run("xcrun", ["simctl", "shutdown", udid], { log });
      await run("xcrun", ["simctl", "delete", udid], { log });
    }
  }
  for (const line of capture("ps", ["-eo", "pid=,command="]).split("\n")) {
    const [, emulatorPid, pid] =
      /^\s*(\d+) .*-avd ci-local-(\d+)-/.exec(line) ?? [];
    if (emulatorPid && dead(pid)) process.kill(Number(emulatorPid), "SIGKILL");
  }
}
