import { spawn } from "node:child_process";
import { existsSync, openSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod/v4";

import type { Platform } from "./app.ts";
import { androidAbi } from "./app.ts";
import {
  cacheDir,
  capture,
  lock,
  mustRun,
  portFree,
  run,
  sleep,
  tryCapture,
} from "./run.ts";

export interface Device {
  /** What `maestro --device` and adb -s / simctl take. */
  id: string;
  release: () => Promise<void>;
}

const IOS_MODEL = /^iPhone \d+ Pro Max$/;
const ANDROID_MODEL = "Pixel 7";

export const androidHome =
  process.env.ANDROID_HOME ??
  process.env.ANDROID_SDK_ROOT ??
  join(
    homedir(),
    process.platform === "darwin" ? "Library/Android/sdk" : "Android/Sdk",
  );

const adb = join(androidHome, "platform-tools/adb");

const RuntimeList = z.object({
  runtimes: z.array(
    z.object({
      platform: z.string(),
      identifier: z.string(),
      version: z.string(),
      supportedDeviceTypes: z.array(
        z.object({ name: z.string(), identifier: z.string() }),
      ),
    }),
  ),
});

const versionParts = (v: string) => v.split(".").map(Number);

function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** CI's simulator: the newest Pro Max on the newest runtime that has one. */
function iosModel(): { name: string; type: string; runtime: string } {
  const list = RuntimeList.parse(
    JSON.parse(
      capture("xcrun", ["simctl", "list", "runtimes", "available", "--json"]),
    ),
  );
  const candidates = list.runtimes
    .filter((runtime) => runtime.platform === "iOS")
    .flatMap((runtime) =>
      runtime.supportedDeviceTypes
        .filter((type) => IOS_MODEL.test(type.name))
        .map((type) => ({
          name: type.name,
          type: type.identifier,
          runtime: runtime.identifier,
          order: [
            ...versionParts(runtime.version),
            Number(/\d+/.exec(type.name)?.[0] ?? 0),
          ],
        })),
    )
    .sort((a, b) => compareVersions(a.order, b.order));
  const newest = candidates.at(-1);
  if (!newest)
    throw new Error(
      "No iPhone Pro Max simulator runtime installed (Xcode > Settings > Components)",
    );
  return newest;
}

/** CI runs API 34; take that when installed, else the newest google_apis image. */
export function androidImage(): string | undefined {
  const images = join(androidHome, "system-images");
  if (!existsSync(images)) return undefined;
  // Numbered levels only: a preview such as android-Tiramisu won't boot the app.
  const level = (api: string) =>
    Number(/^android-(\d+(?:\.\d+)?)$/.exec(api)?.[1]);
  const apis = readdirSync(images)
    .filter(
      (api) =>
        level(api) && existsSync(join(images, api, "google_apis", androidAbi)),
    )
    .sort((a, b) => level(a) - level(b));
  const api = apis.includes("android-34") ? "android-34" : apis.at(-1);
  return api && `system-images;${api};google_apis;${androidAbi}`;
}

async function waitForAndroidBoot(serial: string): Promise<void> {
  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    if (
      tryCapture(adb, [
        "-s",
        serial,
        "shell",
        "getprop",
        "sys.boot_completed",
      ]) === "1"
    )
      return;
    await sleep(3000);
  }
  throw new Error(`${serial} did not finish booting in 5 minutes`);
}

/**
 * An emulator port no other emulator, and no other run's emulator, can take
 * while this one lives: two runs on one port would drive each other's device.
 * Inside adb's scan range (5555-5585), so the default adb server finds it.
 */
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

/** Devices this run creates for itself and deletes again. */
async function throwaway(
  platform: Platform,
  name: string,
  dir: string,
  log: string,
): Promise<Device> {
  if (platform === "ios") {
    const model = iosModel();
    const udid = capture("xcrun", [
      "simctl",
      "create",
      name,
      model.type,
      model.runtime,
    ]);
    await mustRun("xcrun", ["simctl", "boot", udid], { log });
    await mustRun("xcrun", ["simctl", "bootstatus", udid], { log });
    return {
      id: udid,
      release: async () => {
        await run("xcrun", ["simctl", "shutdown", udid], { log });
        await run("xcrun", ["simctl", "delete", udid], { log });
      },
    };
  }

  const image = androidImage();
  if (!image)
    throw new Error(
      `No google_apis ${androidAbi} system image in ${androidHome}`,
    );
  // Its own AVD home keeps the AVD out of Android Studio's list.
  const env = { ANDROID_AVD_HOME: join(dir, `avd-${name}`) };
  await mustRun(
    join(androidHome, "cmdline-tools/latest/bin/avdmanager"),
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
    { log, env, input: "no\n" },
  );
  const { port, unclaim } = await claimEmulatorPort();
  const out = openSync(log, "a");
  const emulator = spawn(
    join(androidHome, "emulator/emulator"),
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
      env: { ...process.env, ...env },
      stdio: ["ignore", out, out],
      detached: true,
    },
  );
  emulator.unref();
  const exited = new Promise<void>((done) =>
    emulator.once("exit", () => done()),
  );
  const serial = `emulator-${port}`;
  const release = async () => {
    await run(adb, ["-s", serial, "emu", "kill"], { log });
    await Promise.race([exited, sleep(60_000)]);
    emulator.kill("SIGKILL");
    rmSync(env.ANDROID_AVD_HOME, { recursive: true, force: true });
    unclaim();
  };
  try {
    await mustRun(adb, ["-s", serial, "wait-for-device"], { log });
    await waitForAndroidBoot(serial);
  } catch (error) {
    await release();
    throw error;
  }
  return { id: serial, release };
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

/** A device leased from a Simlock gateway (SIMLOCK_URL, SIMLOCK_TOKEN). */
async function leased(
  platform: Platform,
  gateway: { url: string; token: string },
  log: string,
): Promise<Device> {
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
    platform === "ios"
      ? { platform, device: iosModel().name }
      : { platform, device: ANDROID_MODEL, imageTag: "google_apis" };

  let lease: z.infer<typeof Lease> | undefined;
  while (!lease) {
    const created = await api("/v1/lease-requests", {
      method: "POST",
      body: JSON.stringify({ ...body, ttlMs: 2 * 60 * 60_000 }),
    });
    // One token holds one waiting request per platform; another run on the
    // same token is waiting, so take turns.
    if (created.error?.code === "REQUESTER_ALREADY_LEASED") {
      await sleep(10_000);
      continue;
    }
    let request = created.request;
    if (!request)
      throw new Error(
        `Lease request refused: ${created.error?.message ?? "no answer"}`,
      );
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
  const { id: leaseId, ttlMs } = lease;
  const renew = setInterval(() => {
    api(`/v1/leases/${leaseId}/renew`, { method: "POST" }).catch(() => {});
  }, ttlMs / 3);
  renew.unref();
  const release = async () => {
    clearInterval(renew);
    await api(`/v1/leases/${leaseId}`, { method: "DELETE" });
  };

  // Maestro runs here, so the device has to be on this machine.
  const elsewhere = new Error(
    `Leased a device on worker ${lease.worker?.label ?? "?"}, but ci:local only drives devices on this machine`,
  );
  if (platform === "ios") {
    if (!capture("xcrun", ["simctl", "list", "devices"]).includes(lease.udid)) {
      await release();
      throw elsewhere;
    }
    return { id: lease.udid, release };
  }
  // Simlock's emulators sit on Simlock's own adb server, and Maestro only
  // talks to the default one: attach through the emulator's adb port.
  const serial = `127.0.0.1:${Number(lease.address.replace("emulator-", "")) + 1}`;
  await run(adb, ["connect", serial], { log });
  if (tryCapture(adb, ["-s", serial, "get-state"]) !== "device") {
    await release();
    throw elsewhere;
  }
  return {
    id: serial,
    release: async () => {
      await run(adb, ["disconnect", serial], { log });
      await release();
    },
  };
}

export function gatewayFromEnv(): { url: string; token: string } | undefined {
  const url = process.env.SIMLOCK_URL;
  if (!url) return undefined;
  const token = process.env.SIMLOCK_TOKEN;
  if (!token) throw new Error("SIMLOCK_URL is set but SIMLOCK_TOKEN is not");
  return { url: url.replace(/\/$/, ""), token };
}

export function acquire(
  platform: Platform,
  name: string,
  dir: string,
  log: string,
): Promise<Device> {
  const gateway = gatewayFromEnv();
  return gateway
    ? leased(platform, gateway, log)
    : throwaway(platform, name, dir, log);
}

/** Installs the app and sets the device up the way CI's jobs do. */
export async function prepare(
  platform: Platform,
  device: Device,
  app: string,
  webPort: number,
  log: string,
): Promise<void> {
  if (platform === "ios") {
    const simctl = (...args: string[]) =>
      mustRun("xcrun", ["simctl", ...args], { log });
    await simctl(
      "spawn",
      device.id,
      "defaults",
      "write",
      "com.apple.Accessibility",
      "ReduceMotionEnabled",
      "1",
    );
    await simctl("install", device.id, app);
    // The first launch pays dyld/springboard warm-up, which stalls past the
    // first flow's wait if it happens inside Maestro.
    await run("xcrun", ["simctl", "launch", device.id, "com.flatcove.app.v2"], {
      log,
    });
    await sleep(15_000);
    await run(
      "xcrun",
      ["simctl", "terminate", device.id, "com.flatcove.app.v2"],
      { log },
    );
    return;
  }
  const shell = (...args: string[]) =>
    run(adb, ["-s", device.id, "shell", ...args], { log });
  // ANR dialogs overlay the app and hide it from Maestro's hierarchy.
  await shell("settings", "put", "global", "hide_error_dialogs", "1");
  for (const scale of [
    "window_animation_scale",
    "transition_animation_scale",
    "animator_duration_scale",
  ])
    await shell("settings", "put", "global", scale, "0");
  // The app and Maestro's host-side scripts both use localhost.
  await mustRun(
    adb,
    ["-s", device.id, "reverse", `tcp:${webPort}`, `tcp:${webPort}`],
    { log },
  );
  await mustRun(adb, ["-s", device.id, "install", "-r", app], { log });
  await shell(
    "monkey",
    "-p",
    "com.flatcove.app",
    "-c",
    "android.intent.category.LAUNCHER",
    "1",
  );
  await sleep(15_000);
  await shell("am", "force-stop", "com.flatcove.app");
  // hide_error_dialogs only suppresses future dialogs.
  await shell(
    "am",
    "broadcast",
    "-a",
    "android.intent.action.CLOSE_SYSTEM_DIALOGS",
  );
}
