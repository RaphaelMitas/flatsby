import { Effect } from "effect";
import { z } from "zod/v4";

import { and, asc, count, eq } from "@flatsby/db";
import { pins } from "@flatsby/db/schema";
import { groupIdInputSchema } from "@flatsby/validators/group";
import {
  createPinSchema,
  MAX_PINS_PER_GROUP,
  pinRefSchema,
  pinSchema,
  updatePinSchema,
} from "@flatsby/validators/pinboard";

import { requireMember } from "../effect/groups";
import { runResult } from "../effect/runtime";
import { Database } from "../effect/services/Database";
import { firstReturned } from "../effect/shoppingLists";
import { fail, getApiResultZod } from "../errors";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const pinIn = ({ groupId, id }: z.infer<typeof pinRefSchema>) =>
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
        const counted = yield* database.query("count pins", (db) =>
          db
            .select({ total: count() })
            .from(pins)
            .where(eq(pins.groupId, input.groupId)),
        );
        const { total } = yield* firstReturned(counted);
        if (total >= MAX_PINS_PER_GROUP) {
          return yield* fail.conflict("pinboard.full");
        }
        const created = yield* database.query("create pin", (db) =>
          db
            .insert(pins)
            .values({ ...input, createdByGroupMemberId: member.id })
            .returning({ id: pins.id }),
        );
        return yield* firstReturned(created);
      }),
    ),
  ),

  update: protectedProcedure.input(updatePinSchema).mutation(({ ctx, input }) =>
    runResult(
      ctx,
      Effect.gen(function* () {
        yield* requireMember(input.groupId);
        const database = yield* Database;
        return yield* database.findOneOrFail("pin", async (db) => {
          const [updated] = await db
            .update(pins)
            .set({
              title: input.title,
              body: input.body,
              icon: input.icon,
              wifi: input.wifi,
            })
            .where(pinIn(input))
            .returning({ id: pins.id });
          return updated;
        });
      }),
    ),
  ),

  delete: protectedProcedure.input(pinRefSchema).mutation(({ ctx, input }) =>
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
});
