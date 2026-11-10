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
import { z } from "zod/v4";

import type { Platform } from "./app.ts";
import { localAndroidAbi } from "./app.ts";
import {
  alive,
  capture,
  claimPorts,
  isLoopback,
  mustRun,
  run,
  signal,
  sleep,
  tryCapture,
} from "./run.ts";

export interface Gateway {
  url: string;
  token: string;
}

export interface DeviceContext {
  platform: Platform;
  avdDir: string;
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
export const IOS_MODEL = "^iPhone [0-9]+ Pro Max$";
const ANDROID_MODEL = "Pixel 7";
const BOOT_TIMEOUT_MS = 10 * 60_000;

const note = (log: string, line: string) => appendFileSync(log, `${line}\n`);

function deleteSimulator(udid: string, log: string) {
  const opts = { log, cleanup: true };
  return run("xcrun", ["simctl", "shutdown", udid], opts).then(() =>
    run("xcrun", ["simctl", "delete", udid], opts),
  );
}

// Empty when `ps` fails, e.g. killed by the Ctrl-C a cleanup is waiting out.
function processes(): { pid: number; command: string }[] {
  return (tryCapture("ps", ["-eo", "pid=,command="]) ?? "")
    .split("\n")
    .flatMap((line) => {
      const [, pid, command] = /^\s*(\d+) (.*)$/.exec(line) ?? [];
      return pid && command ? [{ pid: Number(pid), command }] : [];
    });
}

const emulatorPids = (avd: string) =>
  processes()
    .filter(({ command }) => command.includes(`-avd ${avd} `))
    .map(({ pid }) => pid);

// The emulator alone, not its process group: the first emulator started on a
// machine also hosts netsimd, which every other emulator's network goes through.
async function stopEmulator(avd: string): Promise<void> {
  for (const pid of emulatorPids(avd)) signal(pid, "SIGTERM");
  for (let i = 0; i < 30 && emulatorPids(avd).length; i++) await sleep(1000);
  for (const pid of emulatorPids(avd)) signal(pid, "SIGKILL");
}

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
  ctx.onCleanup(() => deleteSimulator(udid, ctx.log));
  await mustRun("xcrun", ["simctl", "boot", udid], { log: ctx.log });
  return udid;
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
  const avdHome = join(ctx.avdDir, name);
  // Claimed so two runs never drive one emulator; 5560-5584 sits in the range
  // the default adb server scans.
  const ports = Array.from({ length: 13 }, (_, i) => 5560 + i * 2);
  const { port, unclaim } = await claimPorts("emulator-ports", ports, 2);
  const serial = `emulator-${port}`;
  ctx.onCleanup(async () => {
    await stopEmulator(name);
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
  let failed: string | undefined;
  child.once("error", (error) => {
    failed = error.message;
  });
  child.unref();

  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (failed || child.exitCode !== null)
      throw new Error(
        `${name} stopped while booting${failed ? `: ${failed}` : ""}, see ${ctx.log}`,
      );
    const prop = (key: string) =>
      tryCapture(adb, ["-s", serial, "shell", "getprop", key]);
    if (prop("sys.boot_completed") === "1") {
      // Another emulator can take the port before ours binds it.
      const avd = prop("ro.boot.qemu.avd_name");
      if (avd && avd !== name)
        throw new Error(`${serial} is not this run's emulator`);
      return serial;
    }
    await sleep(3000);
  }
  throw new Error(`${name} did not finish booting in 10 minutes`);
}

const SimlockError = z.object({ code: z.string(), message: z.string() });
const Lease = z.object({
  id: z.string(),
  // A simulator UDID, or a Simlock emulator's AVD name.
  udid: z.string().regex(/^[0-9A-F-]{36}$|^simlock_[0-9a-f-]+$/),
  address: z.string().regex(/^emulator-\d+$|^[0-9A-F-]{36}$/),
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

function localWorker(): string | undefined {
  try {
    const config: unknown = JSON.parse(
      capture("simlock", ["config", "get", "gateway"]),
    );
    return z.object({ label: z.string() }).parse(config).label;
  } catch {
    return undefined;
  }
}

async function leaseDevice(
  ctx: DeviceContext,
  gateway: Gateway,
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
    try {
      return LeaseRequest.parse(text ? JSON.parse(text) : {});
    } catch {
      throw new Error(
        `Gateway answered ${response.status} to ${path}: ${text.slice(0, 200)}`,
      );
    }
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
  let waitingSaid = false;
  while (!lease) {
    const created = await api("/v1/lease-requests", {
      method: "POST",
      body: JSON.stringify({ ...body, ttlMs: 15 * 60_000 }),
    });
    if (created.error?.code === "REQUESTER_ALREADY_LEASED") {
      const why =
        "another run on this token is waiting, or the gateway's lease.maxPerRequester is below --devices";
      if (Date.now() > waitUntil)
        throw new Error(`No ${ctx.platform} lease in 30 minutes: ${why}`);
      if (!waitingSaid)
        console.log(`${ctx.platform}: waiting for a lease, ${why}`);
      waitingSaid = true;
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
    if (!request.lease)
      throw new Error(`Lease ${request.id} granted without a device`);
    lease = request.lease;
  }
  const leaseId = lease.id;
  // Maestro has to run beside the device, and device names repeat across
  // workers, so the lease must be on this machine's own worker. Only a gateway
  // names the worker; a worker reached directly is this one if it's local.
  const worker = lease.worker?.label;
  const local = worker ? worker === localWorker() : isLoopback(gateway.url);
  if (!local) {
    await api(`/v1/leases/${leaseId}`, { method: "DELETE" });
    lease = undefined;
    requestId = undefined;
    throw new Error(
      `Leased a device on worker ${worker ?? gateway.url}, but ci:local only drives devices on this machine`,
    );
  }
  const renewFailed = (reason: string) =>
    note(ctx.log, `Renewing lease ${leaseId} failed: ${reason}`);
  renew = setInterval(() => {
    api(`/v1/leases/${leaseId}/renew`, { method: "POST" })
      .then((answer) => answer.error && renewFailed(answer.error.message))
      .catch((error: unknown) => renewFailed(String(error)));
  }, lease.ttlMs / 3);
  renew.unref();

  if (ctx.platform === "ios") {
    if (
      !capture("xcrun", ["simctl", "list", "devices"]).includes(
        `(${lease.udid})`,
      )
    )
      throw new Error(
        "The worker keeps its simulators outside Xcode's device set, where Maestro can't reach them: run `simlock config set drivers.ios.deviceSet default` on it",
      );
    return lease.udid;
  }
  // Simlock's emulators sit on Simlock's own adb server, and Maestro only
  // talks to the default one: attach through the emulator's adb port.
  const serial = `127.0.0.1:${Number(lease.address.replace("emulator-", "")) + 1}`;
  ctx.onCleanup(() =>
    run(adb, ["disconnect", serial], { log: ctx.log, cleanup: true }),
  );
  if ((await run(adb, ["connect", serial], { log: ctx.log })) !== 0)
    throw new Error(`adb connect ${serial} failed, see ${ctx.log}`);
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
    for (let i = 0; i < count; i++) ids.push(await leaseDevice(ctx, gateway));
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
    const devices = tryCapture("xcrun", ["simctl", "list", "devices"]) ?? "";
    for (const line of devices.split("\n")) {
      const [, pid, udid] =
        /ci-local-(\d+)-\S+ \(([0-9A-F-]{36})\)/.exec(line) ?? [];
      if (udid && dead(pid)) await deleteSimulator(udid, log);
    }
  }
  for (const { pid, command } of processes()) {
    const [, runner] = /-avd ci-local-(\d+)-/.exec(command) ?? [];
    if (dead(runner)) signal(pid, "SIGKILL");
  }
}
