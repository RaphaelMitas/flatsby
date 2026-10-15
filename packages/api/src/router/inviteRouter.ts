import { Effect } from "effect";

import { and, eq, gt, lte } from "@flatsby/db";
import { groupInvites } from "@flatsby/db/schema";
import { groupIdInputSchema } from "@flatsby/validators/group";
import {
  DAY_MS,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_TTL_DAYS,
  inviteCodeInputSchema,
} from "@flatsby/validators/invite";

import type { Database } from "../types";
import { Errors, withErrorHandlingAsResult } from "../errors";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { DbUtils, GroupUtils } from "../utils";

const generateCode = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(INVITE_CODE_LENGTH)),
    (byte) => INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length],
  ).join("");

const liveInviteWhere = (code: string) =>
  and(eq(groupInvites.code, code), gt(groupInvites.expiresAt, new Date()));

const issueInvite = (
  db: Database,
  groupId: number,
  userId: string,
  { onlyIfExpired }: { onlyIfExpired: boolean },
) =>
  DbUtils.findOneOrFail(
    () =>
      db.transaction(async (tx) => {
        await GroupUtils.lockGroup(tx, groupId);
        const admin = await tx.query.groupMembers.findFirst({
          where: GroupUtils.activeAdminWhere(groupId, userId),
          columns: { id: true },
        });
        if (!admin) return undefined;
        const invite = {
          code: generateCode(),
          createdByMemberId: admin.id,
          expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * DAY_MS),
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
    "adminMembership",
  );

// Expired, reset and made-up codes all fail the same way, so a code reveals nothing.
const findLiveInvite = (db: Database, code: string) =>
  DbUtils.findOneOrFail(
    () =>
      db.query.groupInvites.findFirst({
        where: liveInviteWhere(code),
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
    "invite",
  );

export const inviteRouter = createTRPCRouter({
  // A query that writes: an admin opening the sheet after expiry should see a fresh code, not a dead one.
  get: protectedProcedure.input(groupIdInputSchema).query(({ ctx, input }) =>
    withErrorHandlingAsResult(
      ctx.locale,
      issueInvite(ctx.db, input.groupId, ctx.session.user.id, {
        onlyIfExpired: true,
      }),
    ),
  ),

  reset: protectedProcedure
    .input(groupIdInputSchema)
    .mutation(({ ctx, input }) =>
      withErrorHandlingAsResult(
        ctx.locale,
        issueInvite(ctx.db, input.groupId, ctx.session.user.id, {
          onlyIfExpired: false,
        }),
      ),
    ),

  /** Public so the join page can show who is inviting before sign-in. */
  preview: publicProcedure
    .input(inviteCodeInputSchema)
    .query(({ ctx, input }) =>
      withErrorHandlingAsResult(
        ctx.locale,
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
        ctx.locale,
        Effect.flatMap(findLiveInvite(ctx.db, input.code), ({ group }) =>
          GroupUtils.addMember(
            ctx.db,
            group.id,
            ctx.session.user.id,
            async (tx) =>
              (await tx.query.groupInvites.findFirst({
                where: liveInviteWhere(input.code),
                columns: { groupId: true },
              }))
                ? undefined
                : Errors.notFound("invite"),
          ).pipe(
            // A stale preview from another tab or device still offers Join, so joining again just opens the group
            Effect.catchTag("ConflictError", () => Effect.void),
            Effect.as({ groupId: group.id, groupName: group.name }),
          ),
        ),
      ),
    ),
});
