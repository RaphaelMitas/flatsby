import { Effect } from "effect";

import {
  addMemberTx,
  findActiveAdmin,
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
