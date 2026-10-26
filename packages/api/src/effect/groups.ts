import { Effect } from "effect";

import { and, eq, inArray } from "@flatsby/db";
import { groupMembers } from "@flatsby/db/schema";

import { Errors } from "../errors";
import {
  addMemberTx,
  findActiveAdmin,
  findActiveMember,
  findGroupWithMembers,
  withThisMember,
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
    return yield* withThisMember(group, user.id);
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
) {
  const database = yield* Database;
  const result = yield* database.query("transaction: add group member", (db) =>
    db.transaction((tx) => addMemberTx(tx, groupId, userId)),
  );
  if (typeof result !== "number") {
    return yield* result;
  }
  return result;
});

export const requireActiveMembersIn = (
  activeMembers: readonly { id: number }[],
  memberIds: Iterable<number>,
) => {
  const active = new Set(activeMembers.map((member) => member.id));
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
        .select({ id: groupMembers.id })
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
