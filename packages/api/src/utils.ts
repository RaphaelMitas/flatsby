import { Effect } from "effect";

import type { ApiError, NotFoundError } from "./errors";
import type {
  Database,
  GroupMember,
  GroupWithAccess,
  Role,
  ShoppingListWithGroup,
  TransactionOperation,
  User,
} from "./types";
import { fail, safeDbOperation, withErrorHandling } from "./errors";

/**
 * Database operation utilities
 */
export const DbUtils = {
  /**
   * Find a single record or fail with NotFound error
   */
  findOneOrFail: <T>(
    operation: () => Promise<T | undefined>,
    resource: string,
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
    action: string,
    resource?: string,
    customMessage?: string,
  ): Effect.Effect<void, ApiError> => {
    return hasAccess
      ? Effect.succeed(undefined)
      : fail.forbidden(action, resource, customMessage);
  },

  /**
   * Ensure user is a member of a group
   */
  ensureGroupMember: (
    userId: string,
    groupMembers: Pick<GroupMember, "userId">[],
    customMessage?: string,
  ): Effect.Effect<void, ApiError> => {
    const isMember = groupMembers.some((member) => member.userId === userId);
    return DbUtils.checkAccess(
      isMember,
      "access this",
      "group",
      customMessage ?? "You must be a member of this group",
    );
  },

  /**
   * Ensure user has admin role in a group
   */
  ensureGroupAdmin: (
    userId: string,
    groupMembers: Pick<GroupMember, "userId" | "role">[],
    customMessage?: string,
  ): Effect.Effect<void, ApiError> => {
    const member = groupMembers.find((m) => m.userId === userId);
    const isAdmin = member?.role === "admin";
    return DbUtils.checkAccess(
      isAdmin,
      "perform admin actions in this",
      "group",
      customMessage ?? "You must be an admin to perform this action",
    );
  },

  /**
   * Ensure it's not the last admin being removed
   */
  ensureNotLastAdmin: (
    targetMemberId: number,
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
      "remove the last admin from this",
      "group",
      "Cannot remove the last admin from the group",
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
    fieldName: string,
  ): Effect.Effect<string, ApiError> => {
    return value.trim().length > 0
      ? Effect.succeed(value)
      : fail.validation(fieldName, "cannot be empty");
  },

  /**
   * Validate that a number is positive
   */
  positive: (
    value: number,
    fieldName: string,
  ): Effect.Effect<number, ApiError> => {
    return value > 0
      ? Effect.succeed(value)
      : fail.validation(fieldName, "must be positive");
  },

  /**
   * Validate that an array is not empty
   */
  notEmptyArray: <T>(
    value: T[],
    fieldName: string,
  ): Effect.Effect<T[], ApiError> => {
    return value.length > 0
      ? Effect.succeed(value)
      : fail.validation(fieldName, "cannot be empty");
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
              return fail.notFound("group member", userId);
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
                    columns: { userId: true },
                  },
                },
              },
            },
          }),
        "shopping list",
      ),
      (list) =>
        Effect.map(
          DbUtils.ensureGroupMember(
            userId,
            list.group.groupMembers,
            "You don't have access to this shopping list",
          ),
          () => list,
        ),
    );
  },
};

/**
 * AI and categorization utilities
 */
export const AIUtils = {
  /**
   * Categorize item with AI and fallback to "other"
   */
  categorizeItemSafely: <T extends string>(
    itemName: string,
    categorizeFn: (name: string) => Promise<T>,
  ): Effect.Effect<T, never> => {
    return Effect.orElse(
      Effect.tryPromise({
        try: () => categorizeFn(itemName),
        catch: () => new Error("AI categorization failed"),
      }),
      () => Effect.succeed("other" as T),
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
            and(eq(members.userId, userId), eq(members.groupId, groupId)),
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
      "group membership",
    );
  },

  /**
   * Get user's basic membership info in a group
   */
  getBasicMembership: (
    db: Database,
    groupId: number,
    userId: string,
  ): Effect.Effect<GroupMember, ApiError> => {
    return DbUtils.findOneOrFail(
      () =>
        db.query.groupMembers.findFirst({
          where: (members, { and, eq }) =>
            and(eq(members.userId, userId), eq(members.groupId, groupId)),
        }),
      "group membership",
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
            and(eq(members.groupId, groupId), eq(members.userId, userId)),
        }),
      "group membership",
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
            ),
        }),
      "admin membership",
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
            and(eq(members.userId, userId), eq(members.groupId, groupId)),
        }),
      "group membership",
    );
  },
};

/**
 * Helper to migrate existing tRPC procedures
 * Usage: return withErrorHandling(yourEffectChain)
 */
export { withErrorHandling, safeDbOperation };

/**
 * Helper to convert a simple async function to Effect with error handling
 */
export const effectify = <T>(
  asyncFn: () => Promise<T>,
  operationName: string,
): Effect.Effect<T, ApiError> => {
  return safeDbOperation(asyncFn, operationName);
};
