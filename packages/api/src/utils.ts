import type { MessageKey } from "@flatsby/i18n/message-key";
import type { Messages } from "@flatsby/i18n/messages";
import { Effect } from "effect";

import { calculateDebts } from "@flatsby/validators/expenses/debt";

import type { ApiError, NotFoundError, NotFoundResource } from "./errors";
import type {
  Database,
  GroupMember,
  GroupWithAccess,
  Role,
  ShoppingListWithGroup,
  TransactionOperation,
  User,
} from "./types";
import { fail, safeDbOperation } from "./errors";

/**
 * Database operation utilities
 */
export const DbUtils = {
  /**
   * Find a single record or fail with NotFound error
   */
  findOneOrFail: <T>(
    operation: () => Promise<T | undefined>,
    resource: NotFoundResource,
  ): Effect.Effect<T, ApiError> => {
    return Effect.flatMap(
      safeDbOperation(operation, `find ${resource}`),
      (result) => (result ? Effect.succeed(result) : fail.notFound(resource)),
    );
  },

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
   * Ensure user is a member of a group
   */
  ensureGroupMember: (
    userId: string,
    groupMembers: Pick<GroupMember, "userId">[],
    messageKey: MessageKey = "errors.mustBeGroupMember",
  ): Effect.Effect<void, ApiError> => {
    const isMember = groupMembers.some((member) => member.userId === userId);
    return DbUtils.checkAccess(isMember, messageKey);
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

  /**
   * Safe transaction wrapper
   */
  transaction:
    <T>(operation: TransactionOperation<T>, operationName: string) =>
    (db: Database): Effect.Effect<T, ApiError> => {
      return safeDbOperation(
        () => db.transaction(operation),
        `transaction: ${operationName}`,
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
 * Common operation patterns
 */
export const OperationUtils = {
  /**
   * Get group with membership check
   */
  getGroupWithAccess: (
    db: Database,
    groupId: number,
    userId: string,
  ): Effect.Effect<GroupWithAccess, ApiError | NotFoundError> => {
    return Effect.flatMap(
      DbUtils.findOneOrFail(
        () =>
          db.query.groups.findFirst({
            where: (groups, { eq }) => eq(groups.id, groupId),
            with: {
              groupMembers: {
                where: (members, { eq }) => eq(members.isActive, true),
                columns: { id: true, userId: true, role: true, joinedOn: true },
                with: {
                  user: {
                    columns: { email: true, name: true, image: true },
                  },
                },
              },
            },
          }),
        "group",
      ),
      (group) =>
        Effect.flatMap(
          DbUtils.ensureGroupMember(userId, group.groupMembers),
          () => {
            const thisGroupMember = group.groupMembers.find(
              (m) => m.userId === userId,
            );

            if (!thisGroupMember) {
              return fail.notFound("groupMember", userId);
            }

            return Effect.succeed({
              ...group,
              thisGroupMember,
            });
          },
        ),
    );
  },

  /**
   * Get shopping list with access check
   */
  getShoppingListWithAccess: (
    db: Database,
    listId: number,
    userId: string,
  ): Effect.Effect<ShoppingListWithGroup, ApiError> => {
    return Effect.flatMap(
      DbUtils.findOneOrFail(
        () =>
          db.query.shoppingLists.findFirst({
            where: (lists, { eq }) => eq(lists.id, listId),
            with: {
              group: {
                with: {
                  groupMembers: {
                    where: (members, { eq }) => eq(members.isActive, true),
                    columns: { userId: true },
                  },
                },
              },
            },
          }),
        "shoppingList",
      ),
      (list) =>
        Effect.map(
          DbUtils.ensureGroupMember(
            userId,
            list.group.groupMembers,
            "errors.noShoppingListAccess",
          ),
          () => list,
        ),
    );
  },
};

/**
 * Group membership and access control utilities
 */
export const GroupUtils = {
  /**
   * Get user's membership info in a group (with full user details)
   */
  getUserMembership: (
    db: Database,
    groupId: number,
    userId: string,
  ): Effect.Effect<
    GroupMember & {
      user: Pick<User, "email" | "name" | "image">;
    },
    ApiError
  > => {
    return DbUtils.findOneOrFail(
      () =>
        db.query.groupMembers.findFirst({
          where: (members, { and, eq }) =>
            and(
              eq(members.userId, userId),
              eq(members.groupId, groupId),
              eq(members.isActive, true),
            ),
          with: {
            user: {
              columns: {
                email: true,
                name: true,
                image: true,
              },
            },
          },
        }),
      "groupMembership",
    );
  },

  /**
   * Get user's role in a group
   */
  getUserRole: (
    db: Database,
    groupId: number,
    userId: string,
  ): Effect.Effect<Pick<GroupMember, "role">, ApiError> => {
    return DbUtils.findOneOrFail(
      () =>
        db.query.groupMembers.findFirst({
          columns: {
            role: true,
          },
          where: (members, { and, eq }) =>
            and(
              eq(members.groupId, groupId),
              eq(members.userId, userId),
              eq(members.isActive, true),
            ),
        }),
      "groupMembership",
    );
  },

  /**
   * Require user to be an admin of the group, fail if not
   */
  requireAdminAccess: (
    db: Database,
    groupId: number,
    userId: string,
  ): Effect.Effect<GroupMember, ApiError> => {
    return DbUtils.findOneOrFail(
      () =>
        db.query.groupMembers.findFirst({
          where: (members, { and, eq }) =>
            and(
              eq(members.userId, userId),
              eq(members.groupId, groupId),
              eq(members.role, "admin"),
              eq(members.isActive, true),
            ),
        }),
      "adminMembership",
    );
  },

  /**
   * Require user to be a member of the group (any role)
   */
  requireMemberAccess: (
    db: Database,
    groupId: number,
    userId: string,
  ): Effect.Effect<GroupMember, ApiError> => {
    return DbUtils.findOneOrFail(
      () =>
        db.query.groupMembers.findFirst({
          where: (members, { and, eq }) =>
            and(
              eq(members.userId, userId),
              eq(members.groupId, groupId),
              eq(members.isActive, true),
            ),
        }),
      "groupMembership",
    );
  },
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
      },
      with: {
        expenseSplits: {
          columns: { groupMemberId: true, amountInCents: true },
        },
      },
    }),
  );

export { safeDbOperation };

/**
 * Helper to convert a simple async function to Effect with error handling
 */
export const effectify = <T>(
  asyncFn: () => Promise<T>,
  operationName: string,
): Effect.Effect<T, ApiError> => {
  return safeDbOperation(asyncFn, operationName);
};
