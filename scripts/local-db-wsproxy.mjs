#!/usr/bin/env node
/**
 * Minimal Neon-compatible websocket -> TCP proxy for a local Postgres.
 *
 * The app's db client (@neondatabase/serverless) always speaks Postgres over
 * websockets. Against a plain local Postgres (dev or e2e), run this bridge and
 * point DATABASE_URL at localhost — packages/db/src/client.ts detects the
 * localhost URL and routes through ws://localhost:<DB_WSPROXY_PORT>/v1.
 *
 * Usage:
 *   node scripts/local-db-wsproxy.mjs            # :5434 -> 127.0.0.1:5433
 *   DB_WSPROXY_PORT=6000 PG_PORT=5432 node scripts/local-db-wsproxy.mjs
 */
import { createRequire } from "node:module";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Resolve `ws` from packages/db, which depends on it.
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(join(repoRoot, "packages/db/package.json"));
const { WebSocketServer } = require("ws");

const LISTEN_PORT = Number(process.env.DB_WSPROXY_PORT ?? 5434);
const TARGET_HOST = process.env.PG_HOST ?? "127.0.0.1";
const TARGET_PORT = Number(process.env.PG_PORT ?? 5433);

const wss = new WebSocketServer({ port: LISTEN_PORT });
wss.on("connection", (ws) => {
  const tcp = net.connect(TARGET_PORT, TARGET_HOST);
  ws.on("message", (data) => tcp.write(data));
  tcp.on("data", (data) => ws.send(data));
  const close = () => {
    tcp.destroy();
    ws.close();
  };
  ws.on("close", close);
  ws.on("error", close);
  tcp.on("close", () => ws.close());
  tcp.on("error", close);
});
console.log(
  `local-db-wsproxy listening on :${LISTEN_PORT} -> ${TARGET_HOST}:${TARGET_PORT}`,
);
