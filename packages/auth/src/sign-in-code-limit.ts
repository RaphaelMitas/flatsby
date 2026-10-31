import { createHash } from "node:crypto";

import { sql } from "@flatsby/db";
import { db } from "@flatsby/db/client";
import { signInCodeRequests } from "@flatsby/db/schema";
import { inboxOf } from "@flatsby/validators/user";

const MAX_CODES_PER_HOUR = 10;

const windowExpired = sql`${signInCodeRequests.windowStart} < now() - interval '1 hour'`;

const inboxHash = (email: string) =>
  createHash("sha256").update(inboxOf(email)).digest("hex");

// Expired rows go first, so one atomic upsert counts without a window reset
export async function allowSignInCode(email: string) {
  await db.delete(signInCodeRequests).where(windowExpired);
  const [row] = await db
    .insert(signInCodeRequests)
    .values({ emailHash: inboxHash(email), count: 1, windowStart: sql`now()` })
    .onConflictDoUpdate({
      target: signInCodeRequests.emailHash,
      set: { count: sql`${signInCodeRequests.count} + 1` },
    })
    .returning({ count: signInCodeRequests.count });
  return (row?.count ?? 0) <= MAX_CODES_PER_HOUR;
}
