import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { env } from "../env";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

// A local Postgres (dev/e2e) has no Neon websocket endpoint. Route through a
// plain ws->tcp bridge instead: `node scripts/local-db-wsproxy.mjs`.
// Deployed environments use a Neon URL, so this branch never matches there.
if (/@(localhost|127\.0\.0\.1)[:/]/.test(env.DATABASE_URL)) {
  const proxyPort = env.DB_WSPROXY_PORT ?? "5434";
  neonConfig.wsProxy = (host) => `${host}:${proxyPort}/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema });
