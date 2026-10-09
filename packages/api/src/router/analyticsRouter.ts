import { z } from "zod/v4";

import { captureEvent } from "../lib/posthog";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const analyticsRouter = createTRPCRouter({
  capture: publicProcedure
    .input(
      z.object({
        event: z.string(),
        properties: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      captureEvent({
        distinctId: ctx.session?.user.id,
        event: input.event,
        headers: ctx.headers,
        additionalProperties: input.properties,
      });
    }),
});
