import { execFileSync, spawn } from "node:child_process";
import {
  createWriteStream,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const repoRoot = resolve(import.meta.dirname, "../../..");

export const cacheDir =
  process.platform === "darwin"
    ? join(homedir(), "Library/Caches/flatsby-e2e")
    : join(
        process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"),
        "flatsby-e2e",
      );

export interface RunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** Append output to this file instead of the terminal. */
  log?: string;
  input?: string;
  /** Still runs after stopRunning: releasing devices, stopping the stack. */
  cleanup?: boolean;
}

const isCleanupByPid = new Map<number, boolean>();
let stopping = false;

/** False when the process is gone; a process we may not signal still exists. */
export function signal(pid: number, sig: NodeJS.Signals | 0): boolean {
  try {
    process.kill(pid, sig);
    return true;
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "EPERM";
  }
}

export const alive = (pid: number) => signal(pid, 0);

export function stopRunning(): void {
  stopping = true;
  for (const [pid, cleanup] of isCleanupByPid)
    if (!cleanup) signal(-pid, "SIGTERM");
}

export function run(
  cmd: string,
  args: string[],
  options: RunOptions = {},
): Promise<number> {
  // Work started after a signal would outlive the runner.
  if (stopping && !options.cleanup)
    return Promise.reject(new Error("stopping"));
  const log = options.log
    ? createWriteStream(options.log, { flags: "a" })
    : undefined;
  log?.write(`\n$ ${cmd} ${args.join(" ")}\n`);
  const child = spawn(cmd, args, {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, ...options.env },
    // Its own process group, so stopRunning reaches pnpm's and turbo's children.
    detached: true,
    stdio: [
      options.input === undefined ? "ignore" : "pipe",
      log ? "pipe" : "inherit",
      log ? "pipe" : "inherit",
    ],
  });
  if (child.pid) isCleanupByPid.set(child.pid, options.cleanup ?? false);
  child.stdin?.end(options.input);
  if (log) {
    child.stdout?.pipe(log, { end: false });
    child.stderr?.pipe(log, { end: false });
  }
  return new Promise((done, fail) => {
    child.on("error", fail);
    child.on("close", (code) => {
      if (child.pid) isCleanupByPid.delete(child.pid);
      log?.end();
      done(code ?? 1);
    });
  });
}

export async function mustRun(
  cmd: string,
  args: string[],
  options: RunOptions = {},
): Promise<void> {
  const code = await run(cmd, args, options);
  if (code !== 0) {
    const where = options.log ? `, see ${options.log}` : "";
    throw new Error(`${cmd} ${args.join(" ")} exited with ${code}${where}`);
  }
}

export function capture(
  cmd: string,
  args: string[],
  options: Pick<RunOptions, "cwd" | "env"> = {},
): string {
  return execFileSync(cmd, args, {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    // `ps` lists a few hundred processes per booted simulator.
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function tryCapture(cmd: string, args: string[]): string | undefined {
  try {
    return capture(cmd, args);
  } catch {
    return undefined;
  }
}

export const isLoopback = (url: string) =>
  ["localhost", "127.0.0.1"].includes(new URL(url).hostname);

export const sleep = (ms: number) =>
  new Promise<void>((done) => setTimeout(done, ms));

/**
 * A directory lock that outlives a crash: a lock whose owner process is gone
 * is taken over. Returns the release function, or the live holder's pid.
 */
export function tryLock(path: string): (() => void) | number {
  mkdirSync(dirname(path), { recursive: true });
  for (;;) {
    try {
      mkdirSync(path);
      writeFileSync(join(path, "pid"), String(process.pid));
      return () => rmSync(path, { recursive: true, force: true });
    } catch (error) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "EEXIST"
      ))
        throw error;
    }
    let holder = 0;
    try {
      holder = Number(readFileSync(join(path, "pid"), "utf8"));
    } catch {
      // Taken a moment ago and the pid isn't written yet, unless its taker
      // died in between.
      const taken = statSync(path, { throwIfNoEntry: false })?.mtimeMs ?? 0;
      if (Date.now() - taken < 10_000) return 0;
    }
    if (holder && alive(holder)) return holder;
    rmSync(path, { recursive: true, force: true });
  }
}

export async function withLock<T>(
  path: string,
  fn: () => Promise<T>,
): Promise<T> {
  let release = tryLock(path);
  while (typeof release === "number") {
    await sleep(2000);
    release = tryLock(path);
  }
  try {
    return await fn();
  } finally {
    release();
  }
}

async function portFree(port: number): Promise<boolean> {
  // Both: a listener on all interfaces doesn't stop a bind to 127.0.0.1.
  for (const host of ["127.0.0.1", "::"]) {
    const free = await new Promise<boolean>((done) => {
      const server = createServer();
      server.once("error", () => done(false));
      server.listen(port, host, () => server.close(() => done(true)));
    });
    if (!free) return false;
  }
  return true;
}

/**
 * The first of `starts` whose `width` ports are free, claimed so no other run
 * takes them while this one lives.
 */
export async function claimPorts(
  kind: string,
  starts: Iterable<number>,
  width: number,
): Promise<{ port: number; dir: string; unclaim: () => void }> {
  for (const port of starts) {
    const dir = join(cacheDir, kind, String(port));
    const claim = tryLock(dir);
    if (typeof claim === "number") continue;
    const free = await Promise.all(
      Array.from({ length: width }, (_, i) => portFree(port + i)),
    );
    if (free.every(Boolean)) return { port, dir, unclaim: claim };
    claim();
  }
  throw new Error(`No free ${kind}`);
}
