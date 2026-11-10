import { execFileSync, spawn } from "node:child_process";
import {
  createWriteStream,
  mkdirSync,
  readFileSync,
  rmSync,
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
}

const running = new Set<number>();

/** Signals every command still running, with whatever it started. */
export function stopRunning(): void {
  for (const pid of running) {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      // Already gone.
    }
  }
}

export function run(
  cmd: string,
  args: string[],
  options: RunOptions = {},
): Promise<number> {
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
  if (child.pid) running.add(child.pid);
  child.stdin?.end(options.input);
  if (log) {
    child.stdout?.pipe(log, { end: false });
    child.stderr?.pipe(log, { end: false });
  }
  return new Promise((done, fail) => {
    child.on("error", fail);
    child.on("close", (code) => {
      if (child.pid) running.delete(child.pid);
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

export const sleep = (ms: number) =>
  new Promise<void>((done) => setTimeout(done, ms));

export function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * A directory lock that outlives a crash: a lock whose owner process is gone
 * is taken over. Returns the release function, or the holder's pid when the
 * lock is held and `wait` is false.
 */
export async function lock(
  path: string,
  wait: boolean,
): Promise<(() => void) | number> {
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
      // Taken a moment ago and the pid isn't written yet.
    }
    if (holder && !alive(holder)) {
      rmSync(path, { recursive: true, force: true });
      continue;
    }
    if (!wait && holder) return holder;
    await sleep(2000);
  }
}

export function portFree(port: number): Promise<boolean> {
  return new Promise((done) => {
    const server = createServer();
    server.once("error", () => done(false));
    server.listen(port, "127.0.0.1", () => server.close(() => done(true)));
  });
}
