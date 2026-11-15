#!/usr/bin/env node
import { createRequire } from "node:module";
import net from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(join(repoRoot, "packages/db/package.json"));
const { WebSocketServer } = require("ws");

const LISTEN_PORT = Number(process.env.DB_WSPROXY_PORT ?? 5434);
const TARGET_HOST = process.env.PG_HOST ?? "127.0.0.1";
const TARGET_PORT = Number(process.env.PG_PORT ?? 5433);

const wss = new WebSocketServer({
  host: "127.0.0.1",
  port: LISTEN_PORT,
  verifyClient: ({ req }) => !req.headers.origin,
});
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
