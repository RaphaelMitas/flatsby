import { Effect } from "effect";

import { and, eq, gt } from "@flatsby/db";
import { groupInvites } from "@flatsby/db/schema";
import {
  groupInviteInputSchema,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_TTL_DAYS,
  inviteCodeInputSchema,
} from "@flatsby/validators/invite";

import type { Database } from "../types";
import { Errors, safeDbOperation, withErrorHandlingAsResult } from "../errors";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { GroupUtils } from "../utils";

const generateCode = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(INVITE_CODE_LENGTH)),
    (byte) => INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length],
  ).join("");

const issueInvite = (
  db: Database,
  groupId: number,
  createdByMemberId: number,
) => {
  const invite = {
    code: generateCode(),
    createdByMemberId,
    expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
  };
  return Effect.map(
    safeDbOperation(
      () =>
        db
          .insert(groupInvites)
          .values({ groupId, ...invite })
          .onConflictDoUpdate({ target: groupInvites.groupId, set: invite }),
      "issue group invite",
    ),
    () => ({ code: invite.code, expiresAt: invite.expiresAt }),
  );
};

// Expired, reset and made-up codes all fail the same way, so a code reveals nothing.
const findLiveInvite = (db: Database, code: string) =>
  Effect.flatMap(
    safeDbOperation(
      () =>
        db.query.groupInvites.findFirst({
          where: and(
            eq(groupInvites.code, code),
            gt(groupInvites.expiresAt, new Date()),
          ),
          with: {
            group: {
              columns: { id: true, name: true, profilePicture: true },
              with: {
                groupMembers: {
                  where: (members, { eq }) => eq(members.isActive, true),
                  columns: { userId: true },
                  with: { user: { columns: { name: true, image: true } } },
                },
              },
            },
            createdByMember: {
              with: { user: { columns: { name: true } } },
            },
          },
        }),
      "find group invite",
    ),
    (invite) =>
      invite
        ? Effect.succeed(invite)
        : Effect.fail(
            Errors.notFound(
              "invite",
              undefined,
              "This invite has expired. Ask someone in the group for a new one.",
            ),
          ),
  );

export const inviteRouter = createTRPCRouter({
  /** Issues a fresh invite when there is none or it expired, so admins never see a dead code. */
  get: protectedProcedure
    .input(groupInviteInputSchema)
    .query(({ ctx, input }) =>
      withErrorHandlingAsResult(
        Effect.gen(function* () {
          const admin = yield* GroupUtils.requireAdminAccess(
            ctx.db,
            input.groupId,
            ctx.session.user.id,
          );
          const existing = yield* safeDbOperation(
            () =>
              ctx.db.query.groupInvites.findFirst({
                where: eq(groupInvites.groupId, input.groupId),
                columns: { code: true, expiresAt: true },
              }),
            "find group invite",
          );
          if (existing && existing.expiresAt > new Date()) {
            return existing;
          }
          return yield* issueInvite(ctx.db, input.groupId, admin.id);
        }),
      ),
    ),

  reset: protectedProcedure
    .input(groupInviteInputSchema)
    .mutation(({ ctx, input }) =>
      withErrorHandlingAsResult(
        Effect.flatMap(
          GroupUtils.requireAdminAccess(
            ctx.db,
            input.groupId,
            ctx.session.user.id,
          ),
          (admin) => issueInvite(ctx.db, input.groupId, admin.id),
        ),
      ),
    ),

  /** Public so the web landing page can show who is inviting before sign-in. */
  preview: publicProcedure
    .input(inviteCodeInputSchema)
    .query(({ ctx, input }) =>
      withErrorHandlingAsResult(
        Effect.map(
          findLiveInvite(ctx.db, input.code),
          ({ group, createdByMember }) => ({
            groupId: group.id,
            groupName: group.name,
            profilePicture: group.profilePicture,
            invitedBy: createdByMember.user.name,
            memberCount: group.groupMembers.length,
            members: group.groupMembers.slice(0, 3).map(({ user }) => user),
            isMember: group.groupMembers.some(
              (member) => member.userId === ctx.session?.user.id,
            ),
          }),
        ),
      ),
    ),

  join: protectedProcedure
    .input(inviteCodeInputSchema)
    .mutation(({ ctx, input }) =>
      withErrorHandlingAsResult(
        Effect.flatMap(findLiveInvite(ctx.db, input.code), ({ group }) =>
          Effect.map(
            GroupUtils.addMember(ctx.db, group.id, ctx.session.user.id),
            () => ({ groupId: group.id, groupName: group.name }),
          ),
        ),
      ),
    ),
});
