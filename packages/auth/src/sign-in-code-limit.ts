import { createHash } from "node:crypto";

import { sql } from "@flatsby/db";
import { db } from "@flatsby/db/client";
import { signInCodeRequests } from "@flatsby/db/schema";

const MAX_CODES_PER_HOUR = 10;

const windowExpired = sql`${signInCodeRequests.windowStart} < now() - interval '1 hour'`;

// One upsert counts and resets the window, so parallel requests can't slip past the limit
export async function allowSignInCode(email: string) {
  const [row] = await db
    .insert(signInCodeRequests)
    .values({
      emailHash: createHash("sha256").update(email.toLowerCase()).digest("hex"),
      count: 1,
      windowStart: sql`now()`,
    })
    .onConflictDoUpdate({
      target: signInCodeRequests.emailHash,
      set: {
        count: sql`case when ${windowExpired} then 1 else ${signInCodeRequests.count} + 1 end`,
        windowStart: sql`case when ${windowExpired} then now() else ${signInCodeRequests.windowStart} end`,
      },
    })
    .returning({ count: signInCodeRequests.count });
  await db.delete(signInCodeRequests).where(windowExpired);
  return (row?.count ?? 0) <= MAX_CODES_PER_HOUR;
}
