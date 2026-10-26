import type { MessageKey } from "@flatsby/i18n/message-key";
import { Effect } from "effect";

import { and, eq, inArray } from "@flatsby/db";
import { groupMembers } from "@flatsby/db/schema";

import type { ApiError } from "../errors";
import type { DbTransaction } from "../types";
import { Errors } from "../errors";
import {
  addMemberTx,
  findActiveAdmin,
  findActiveMember,
  findGroupWithMembers,
} from "../utils";
import { CurrentRequest } from "./services/CurrentRequest";
import { Database } from "./services/Database";

export const getGroupWithAccess = Effect.fn("Groups.getGroupWithAccess")(
  function* (groupId: number) {
    const { user } = yield* CurrentRequest;
    const database = yield* Database;
    const group = yield* database.findOneOrFail("group", (db) =>
      findGroupWithMembers(db, groupId),
    );
    const thisGroupMember = yield* requireMemberIn(
      group.groupMembers,
      user.id,
      "errors.mustBeGroupMember",
    );
    return { ...group, thisGroupMember };
  },
);

export const requireAdmin = Effect.fn("Groups.requireAdmin")(function* (
  groupId: number,
) {
  const { user } = yield* CurrentRequest;
  const database = yield* Database;
  return yield* database.findOneOrFail("adminMembership", (db) =>
    findActiveAdmin(db, groupId, user.id),
  );
});

export const requireMember = Effect.fn("Groups.requireMember")(function* (
  groupId: number,
) {
  const { user } = yield* CurrentRequest;
  const database = yield* Database;
  return yield* database.findOneOrFail("groupMembership", (db) =>
    findActiveMember(db, groupId, user.id),
  );
});

export const addMember = Effect.fn("Groups.addMember")(function* (
  groupId: number,
  userId: string,
  refusal?: (tx: DbTransaction) => Promise<ApiError | undefined>,
) {
  const database = yield* Database;
  const result = yield* database.query("transaction: add group member", (db) =>
    db.transaction((tx) => addMemberTx(tx, groupId, userId, refusal)),
  );
  if (typeof result !== "number") {
    return yield* result;
  }
  return result;
});

export const requireMemberIn = <
  M extends { userId: string; isActive: boolean },
>(
  members: readonly M[],
  userId: string,
  messageKey: MessageKey,
) => {
  const member = members.find((m) => m.userId === userId && m.isActive);
  return member
    ? Effect.succeed(member)
    : Effect.fail(Errors.forbidden(messageKey));
};

export const requireActiveMembersIn = (
  members: readonly { id: number; isActive: boolean }[],
  memberIds: Iterable<number>,
) => {
  const active = new Set(
    members.filter((member) => member.isActive).map((member) => member.id),
  );
  return [...memberIds].every((id) => active.has(id))
    ? Effect.void
    : Effect.fail(Errors.notFound("groupMember"));
};

export const requireActiveMembers = Effect.fn("Groups.requireActiveMembers")(
  function* (groupId: number, memberIds: Iterable<number>) {
    const ids = [...new Set(memberIds)];
    if (ids.length === 0) return;
    const database = yield* Database;
    const members = yield* database.query("check group members", (db) =>
      db
        .select({ id: groupMembers.id, isActive: groupMembers.isActive })
        .from(groupMembers)
        .where(
          and(
            inArray(groupMembers.id, ids),
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.isActive, true),
          ),
        ),
    );
    return yield* requireActiveMembersIn(members, ids);
  },
);
