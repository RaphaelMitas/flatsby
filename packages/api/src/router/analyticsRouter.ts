import { z } from "zod/v4";

import { posthog } from "../lib/posthog";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const analyticsRouter = createTRPCRouter({
  capture: protectedProcedure
    .input(
      z.object({
        event: z.string(),
        properties: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      if (!posthog) return;

      posthog.capture({
        distinctId: ctx.session.user.id,
        event: input.event,
        properties: input.properties,
      });
    }),
});
