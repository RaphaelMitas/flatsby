import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { env } from "../env";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

if (/@(localhost|127\.0\.0\.1)[:/]/.test(env.DATABASE_URL)) {
  const proxyPort = env.DB_WSPROXY_PORT ?? "5434";
  neonConfig.wsProxy = (host) => `${host}:${proxyPort}/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema });
