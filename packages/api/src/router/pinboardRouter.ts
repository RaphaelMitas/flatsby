import { Effect } from "effect";
import { z } from "zod/v4";

import { and, asc, count, eq } from "@flatsby/db";
import { pins } from "@flatsby/db/schema";
import {
  groupIdInputSchema,
  groupItemRefSchema,
} from "@flatsby/validators/group";
import {
  createPinSchema,
  MAX_PINS_PER_GROUP,
  pinSchema,
  reportPinUseSchema,
  updatePinSchema,
} from "@flatsby/validators/pinboard";

import { requireMember } from "../effect/groups";
import { runResult } from "../effect/runtime";
import { Database } from "../effect/services/Database";
import { Errors, getApiResultZod } from "../errors";
import { captureUserEvent } from "../lib/posthog";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { GroupUtils } from "../utils";

const pinIn = ({ groupId, id }: z.infer<typeof groupItemRefSchema>) =>
  and(eq(pins.id, id), eq(pins.groupId, groupId));

export const pinboardRouter = createTRPCRouter({
  list: protectedProcedure
    .input(groupIdInputSchema)
    .output(getApiResultZod(z.array(pinSchema)))
    .query(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          yield* requireMember(input.groupId);
          const database = yield* Database;
          return yield* database.query("list pins", (db) =>
            db
              .select({
                id: pins.id,
                title: pins.title,
                body: pins.body,
                icon: pins.icon,
                wifi: pins.wifi,
              })
              .from(pins)
              .where(eq(pins.groupId, input.groupId))
              .orderBy(asc(pins.id)),
          );
        }),
      ),
    ),

  create: protectedProcedure.input(createPinSchema).mutation(({ ctx, input }) =>
    runResult(
      ctx,
      Effect.gen(function* () {
        const member = yield* requireMember(input.groupId);
        const database = yield* Database;
        const id = yield* database.query("create pin", (db) =>
          db.transaction(async (tx) => {
            await GroupUtils.lockGroup(tx, input.groupId);
            const [counted] = await tx
              .select({ total: count() })
              .from(pins)
              .where(eq(pins.groupId, input.groupId));
            if ((counted?.total ?? 0) >= MAX_PINS_PER_GROUP)
              return Errors.conflict("pinboard.full");
            const [created] = await tx
              .insert(pins)
              .values({ ...input, createdByGroupMemberId: member.id })
              .returning({ id: pins.id });
            if (!created) throw new Error("Failed to create pin");
            return created.id;
          }),
        );
        if (typeof id !== "number") return yield* id;
        return { id };
      }),
    ),
  ),

  update: protectedProcedure.input(updatePinSchema).mutation(({ ctx, input }) =>
    runResult(
      ctx,
      Effect.gen(function* () {
        yield* requireMember(input.groupId);
        const database = yield* Database;
        const { groupId: _groupId, id: _id, ...content } = input;
        return yield* database.findOneOrFail("pin", async (db) => {
          const [updated] = await db
            .update(pins)
            .set(content)
            .where(pinIn(input))
            .returning({ id: pins.id });
          return updated;
        });
      }),
    ),
  ),

  delete: protectedProcedure
    .input(groupItemRefSchema)
    .mutation(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          yield* requireMember(input.groupId);
          const database = yield* Database;
          return yield* database.findOneOrFail("pin", async (db) => {
            const [deleted] = await db
              .delete(pins)
              .where(pinIn(input))
              .returning({ id: pins.id });
            return deleted;
          });
        }),
      ),
    ),

  reportUse: protectedProcedure
    .input(reportPinUseSchema)
    .mutation(({ ctx, input: { event, ...properties } }) => {
      captureUserEvent({
        user: ctx.session.user,
        event,
        headers: ctx.headers,
        additionalProperties: properties,
      });
    }),
});
