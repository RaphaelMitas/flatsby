import { Effect } from "effect";

import { and, eq, gt, lte } from "@flatsby/db";
import { groupInvites } from "@flatsby/db/schema";
import { groupIdInputSchema } from "@flatsby/validators/group";
import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  inviteCodeInputSchema,
  inviteExpiresAt,
  joinInviteInputSchema,
} from "@flatsby/validators/invite";

import { addMember } from "../effect/groups";
import { runPublicResult, runResult } from "../effect/runtime";
import { CurrentRequest } from "../effect/services/CurrentRequest";
import { Database } from "../effect/services/Database";
import { Errors } from "../errors";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { GroupUtils, memberUserColumns, withMemberUser } from "../utils";

const generateCode = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(INVITE_CODE_LENGTH)),
    (byte) => INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length],
  ).join("");

const liveInviteWhere = (code: string) =>
  and(eq(groupInvites.code, code), gt(groupInvites.expiresAt, new Date()));

const issueInvite = Effect.fn("Invites.issueInvite")(function* (
  groupId: number,
  { onlyIfExpired }: { onlyIfExpired: boolean },
) {
  const { user } = yield* CurrentRequest;
  const database = yield* Database;
  return yield* database.findOneOrFail("adminMembership", (db) =>
    db.transaction(async (tx) => {
      await GroupUtils.lockGroup(tx, groupId);
      const admin = await tx.query.groupMembers.findFirst({
        where: GroupUtils.activeAdminWhere(groupId, user.id),
        columns: { id: true },
      });
      if (!admin) return undefined;
      const invite = {
        code: generateCode(),
        createdByMemberId: admin.id,
        expiresAt: inviteExpiresAt(),
      };
      const [issued] = await tx
        .insert(groupInvites)
        .values({ groupId, ...invite })
        .onConflictDoUpdate({
          target: groupInvites.groupId,
          set: invite,
          setWhere: onlyIfExpired
            ? lte(groupInvites.expiresAt, new Date())
            : undefined,
        })
        .returning({
          code: groupInvites.code,
          expiresAt: groupInvites.expiresAt,
        });
      return (
        issued ??
        (await tx.query.groupInvites.findFirst({
          where: eq(groupInvites.groupId, groupId),
          columns: { code: true, expiresAt: true },
        }))
      );
    }),
  );
});

// Expired, reset and made-up codes all fail the same way, so a code reveals nothing.
const findLiveInvite = Effect.fn("Invites.findLiveInvite")(function* (
  code: string,
) {
  const database = yield* Database;
  return yield* database.findOneOrFail("invite", (db) =>
    db.query.groupInvites.findFirst({
      where: liveInviteWhere(code),
      with: {
        group: {
          columns: { id: true, name: true, profilePicture: true },
          with: {
            groupMembers: {
              where: (members, { eq }) => eq(members.isActive, true),
              columns: { id: true, userId: true, name: true },
              with: { user: { columns: memberUserColumns } },
            },
          },
        },
        createdByMember: {
          with: { user: { columns: memberUserColumns } },
        },
      },
    }),
  );
});

export const inviteRouter = createTRPCRouter({
  // A query that writes: an admin opening the sheet after expiry should see a fresh code, not a dead one.
  get: protectedProcedure
    .input(groupIdInputSchema)
    .query(({ ctx, input }) =>
      runResult(ctx, issueInvite(input.groupId, { onlyIfExpired: true })),
    ),

  reset: protectedProcedure
    .input(groupIdInputSchema)
    .mutation(({ ctx, input }) =>
      runResult(ctx, issueInvite(input.groupId, { onlyIfExpired: false })),
    ),

  /** Public so the join page can show who is inviting before sign-in. */
  preview: publicProcedure
    .input(inviteCodeInputSchema)
    .query(({ ctx, input }) =>
      runPublicResult(
        ctx,
        Effect.map(findLiveInvite(input.code), ({ group, createdByMember }) => {
          const joined = group.groupMembers.flatMap(({ user }) =>
            user ? [{ name: user.name, image: user.image }] : [],
          );
          return {
            groupId: group.id,
            groupName: group.name,
            profilePicture: group.profilePicture,
            invitedBy: withMemberUser(createdByMember).user.name,
            memberCount: joined.length,
            members: joined.slice(0, 3),
            isMember: group.groupMembers.some(
              (member) => member.userId === ctx.session?.user.id,
            ),
            // Names are only for the person about to join, not for link previews
            placeholders: ctx.session
              ? group.groupMembers.flatMap(({ id, userId, name }) =>
                  userId === null && name !== null ? [{ id, name }] : [],
                )
              : [],
          };
        }),
      ),
    ),

  join: protectedProcedure
    .input(joinInviteInputSchema)
    .mutation(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const { user } = yield* CurrentRequest;
          const { group } = yield* findLiveInvite(input.code);
          yield* addMember(
            group.id,
            user.id,
            async (tx) =>
              (await tx.query.groupInvites.findFirst({
                where: liveInviteWhere(input.code),
                columns: { groupId: true },
              }))
                ? undefined
                : Errors.notFound("invite"),
            input.placeholderId,
          ).pipe(
            // A stale preview from another tab or device still offers Join, so joining again just opens the group
            Effect.catchTag("ConflictError", (error) =>
              error.messageKey === "errors.alreadyMember"
                ? Effect.void
                : Effect.fail(error),
            ),
          );
          return { groupId: group.id, groupName: group.name };
        }),
      ),
    ),
});
