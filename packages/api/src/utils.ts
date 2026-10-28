import type { MessageKey } from "@flatsby/i18n/message-key";
import type { Messages } from "@flatsby/i18n/messages";
import { Effect } from "effect";

import { and, desc, eq, inArray, isNull } from "@flatsby/db";
import {
  expenses,
  expenseSplits,
  groupMembers,
  groups,
  shoppingListItems,
  shoppingLists,
  users,
} from "@flatsby/db/schema";
import { calculateDebts } from "@flatsby/validators/expenses/debt";
import { placeholderUser } from "@flatsby/validators/group";

import type { ApiError } from "./errors";
import type {
  Database,
  DbTransaction,
  GroupMember,
  MemberUser,
  Role,
} from "./types";
import { Errors, fail } from "./errors";

export const DbUtils = {
  /**
   * Check if user has access to a resource
   */
  checkAccess: (
    hasAccess: boolean,
    messageKey: MessageKey,
  ): Effect.Effect<void, ApiError> => {
    return hasAccess ? Effect.succeed(undefined) : fail.forbidden(messageKey);
  },

  /**
   * Ensure user has admin role in a group
   */
  ensureGroupAdmin: (
    userId: string,
    groupMembers: Pick<GroupMember, "userId" | "role">[],
    messageKey: MessageKey = "errors.mustBeAdmin",
  ): Effect.Effect<void, ApiError> => {
    const member = groupMembers.find((m) => m.userId === userId);
    const isAdmin = member?.role === "admin";
    return DbUtils.checkAccess(isAdmin, messageKey);
  },

  /**
   * Ensure it's not the last admin being removed
   */
  ensureNotLastAdmin: (
    _targetMemberId: number,
    targetRole: Role,
    newRole: Role,
    allMembers: Pick<GroupMember, "id" | "role">[],
  ): Effect.Effect<void, ApiError> => {
    const adminCount = allMembers.filter((m) => m.role === "admin").length;
    const isTargetCurrentlyAdmin = targetRole === "admin";
    const willRemoveAdmin = isTargetCurrentlyAdmin && newRole !== "admin";
    const wouldBeLastAdmin = adminCount === 1 && willRemoveAdmin;

    return DbUtils.checkAccess(
      !wouldBeLastAdmin,
      "errors.cannotRemoveLastAdmin",
    );
  },
};

/**
 * Validation utilities
 */
export const ValidationUtils = {
  /**
   * Validate that a string is not empty
   */
  notEmpty: (
    value: string,
    field: keyof Messages["errors"]["empty"],
  ): Effect.Effect<string, ApiError> => {
    return value.trim().length > 0
      ? Effect.succeed(value)
      : fail.validation(`errors.empty.${field}`);
  },
};

/**
 * Group membership and access control utilities
 */
export const GroupUtils = {
  activeAdminWhere: (groupId: number, userId: string) =>
    and(
      eq(groupMembers.userId, userId),
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.role, "admin"),
      eq(groupMembers.isActive, true),
    ),

  /** Serializes membership changes in a group; call it first inside the transaction. */
  lockGroup: (tx: DbTransaction, groupId: number) =>
    tx
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.id, groupId))
      .for("update"),

  detachMemberFromItems: async (tx: DbTransaction, groupMemberId: number) => {
    await tx
      .update(shoppingListItems)
      .set({ createdByGroupMemberId: null })
      .where(eq(shoppingListItems.createdByGroupMemberId, groupMemberId));
    await tx
      .update(shoppingListItems)
      .set({ completedByGroupMemberId: null })
      .where(eq(shoppingListItems.completedByGroupMemberId, groupMemberId));
  },

  deleteGroupExpenses: async (tx: DbTransaction, groupId: number) => {
    await tx
      .delete(expenseSplits)
      .where(
        inArray(
          expenseSplits.expenseId,
          tx
            .select({ id: expenses.id })
            .from(expenses)
            .where(eq(expenses.groupId, groupId)),
        ),
      );
    const deleted = await tx
      .delete(expenses)
      .where(eq(expenses.groupId, groupId))
      .returning({ id: expenses.id });
    return deleted.length;
  },

  /** Foreign keys don't cascade, so every child row goes before its parent. */
  deleteGroupData: async (tx: DbTransaction, groupId: number) => {
    const groupLists = tx
      .select({ id: shoppingLists.id })
      .from(shoppingLists)
      .where(eq(shoppingLists.groupId, groupId));

    await tx
      .delete(shoppingListItems)
      .where(inArray(shoppingListItems.shoppingListId, groupLists));
    await GroupUtils.deleteGroupExpenses(tx, groupId);
    await tx.delete(groupMembers).where(eq(groupMembers.groupId, groupId));
    await tx
      .update(users)
      .set({ lastGroupUsed: null, lastShoppingListUsed: null })
      .where(eq(users.lastGroupUsed, groupId));
    await tx
      .update(users)
      .set({ lastShoppingListUsed: null })
      .where(inArray(users.lastShoppingListUsed, groupLists));
    await tx.delete(shoppingLists).where(eq(shoppingLists.groupId, groupId));
    await tx.delete(groups).where(eq(groups.id, groupId));
  },
};

export const memberUserColumns = {
  email: true,
  name: true,
  image: true,
} as const;

export const memberName = (member: {
  placeholderName: string | null;
  user: { name: string } | null;
}) => member.user?.name ?? member.placeholderName ?? "";

/** Placeholders have no user, so they get one built from their name; released apps read `member.user` unguarded. */
export const withMemberUser = <
  M extends { placeholderName: string | null; user: MemberUser | null },
>({
  placeholderName,
  user,
  ...member
}: M): Omit<M, "user" | "placeholderName"> & { user: MemberUser } => ({
  ...member,
  user: user ?? placeholderUser(placeholderName ?? ""),
});

export const findGroupWithMembers = async (db: Database, groupId: number) => {
  const group = await db.query.groups.findFirst({
    where: (groups, { eq }) => eq(groups.id, groupId),
    with: {
      groupMembers: {
        where: (members, { eq }) => eq(members.isActive, true),
        columns: {
          id: true,
          userId: true,
          placeholderName: true,
          role: true,
          joinedOn: true,
          isActive: true,
        },
        with: { user: { columns: memberUserColumns } },
      },
    },
  });
  return (
    group && {
      ...group,
      groupMembers: group.groupMembers.map((member) => ({
        ...withMemberUser(member),
        placeholderName: member.placeholderName,
      })),
    }
  );
};

export const findActiveMember = (
  db: Database,
  groupId: number,
  userId: string,
) =>
  db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.userId, userId),
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.isActive, true),
    ),
  });

export const findActiveAdmin = (
  db: Database,
  groupId: number,
  userId: string,
) =>
  db.query.groupMembers.findFirst({
    where: GroupUtils.activeAdminWhere(groupId, userId),
  });

/** Callers check the right to add; `refusal` runs under the group lock, so it sees concurrent removals. */
export const addMemberTx = async (
  tx: DbTransaction,
  groupId: number,
  userId: string,
  refusal?: (tx: DbTransaction) => Promise<ApiError | undefined>,
  placeholderId?: number,
): Promise<number | ApiError> => {
  await GroupUtils.lockGroup(tx, groupId);
  const refused = await refusal?.(tx);
  if (refused) return refused;
  const existing = await tx.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
    ),
    orderBy: desc(groupMembers.isActive),
  });
  if (existing?.isActive) return Errors.conflict("errors.alreadyMember");
  if (placeholderId !== undefined) {
    const [claimed] = await tx
      .update(groupMembers)
      .set({ userId })
      .where(
        and(
          eq(groupMembers.id, placeholderId),
          eq(groupMembers.groupId, groupId),
          isNull(groupMembers.userId),
          eq(groupMembers.isActive, true),
        ),
      )
      .returning({ id: groupMembers.id });
    return claimed?.id ?? Errors.conflict("errors.placeholderTaken");
  }
  const [member] = existing
    ? await tx
        .update(groupMembers)
        .set({ isActive: true, role: "member" })
        .where(eq(groupMembers.id, existing.id))
        .returning({ id: groupMembers.id })
    : await tx
        .insert(groupMembers)
        .values({ groupId, userId, role: "member" })
        .returning({ id: groupMembers.id });
  if (!member) throw new Error("Failed to add group member");
  return member.id;
};

/** Does not check group access, callers must. */
export const fetchGroupDebtSummary = async (db: Database, groupId: number) =>
  calculateDebts(
    await db.query.expenses.findMany({
      where: (expenses, { eq }) => eq(expenses.groupId, groupId),
      columns: {
        paidByGroupMemberId: true,
        amountInCents: true,
        currency: true,
        convertedAmountInCents: true,
        convertedCurrency: true,
      },
      with: {
        expenseSplits: {
          columns: { groupMemberId: true, amountInCents: true },
        },
      },
    }),
  );
