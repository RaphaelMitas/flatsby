import { Effect } from "effect";

import { and, eq } from "@flatsby/db";
import {
  groupMembers,
  shoppingListItems,
  shoppingLists,
  users,
} from "@flatsby/db/schema";

import { fail } from "../errors";
import { requireMember, requireMemberIn } from "./groups";
import { CurrentRequest } from "./services/CurrentRequest";
import { Database } from "./services/Database";

export const getListInGroupWithAccess = Effect.fn(
  "ShoppingLists.getListInGroupWithAccess",
)(function* (groupId: number, listId: number) {
  // Membership first, so non-members can't probe which list ids exist
  const member = yield* requireMember(groupId);
  const database = yield* Database;
  const list = yield* database.findOneOrFail("shoppingList", (db) =>
    db.query.shoppingLists.findFirst({
      where: and(
        eq(shoppingLists.id, listId),
        eq(shoppingLists.groupId, groupId),
      ),
      columns: { id: true, name: true },
    }),
  );
  return { member, list };
});

export const getListWithAccess = Effect.fn("ShoppingLists.getListWithAccess")(
  function* (listId: number) {
    const { user } = yield* CurrentRequest;
    const database = yield* Database;
    const list = yield* database.findOneOrFail("shoppingList", (db) =>
      db.query.shoppingLists.findFirst({
        where: eq(shoppingLists.id, listId),
        columns: { id: true },
        with: {
          group: {
            columns: { id: true },
            with: {
              groupMembers: {
                where: and(
                  eq(groupMembers.userId, user.id),
                  eq(groupMembers.isActive, true),
                ),
              },
            },
          },
        },
      }),
    );
    return yield* requireMemberIn(
      list.group.groupMembers,
      user.id,
      "errors.notGroupMember",
    );
  },
);

export const setLastUsed = Effect.fn("ShoppingLists.setLastUsed")(function* (
  groupId: number | null,
  shoppingListId: number | null,
) {
  if (shoppingListId === null) {
    if (groupId !== null) yield* requireMember(groupId);
  } else if (groupId === null) {
    yield* getListWithAccess(shoppingListId);
  } else {
    yield* getListInGroupWithAccess(groupId, shoppingListId);
  }
  const { user } = yield* CurrentRequest;
  const database = yield* Database;
  const updated = yield* database.query("update last used preferences", (db) =>
    db
      .update(users)
      .set(
        groupId === null && shoppingListId !== null
          ? { lastShoppingListUsed: shoppingListId }
          : { lastGroupUsed: groupId, lastShoppingListUsed: shoppingListId },
      )
      .where(eq(users.id, user.id))
      .returning({ id: users.id }),
  );
  const { id } = yield* firstReturned(updated);
  return id;
});

export const getShoppingListItemWithAccess = Effect.fn(
  "ShoppingLists.getShoppingListItemWithAccess",
)(function* (itemId: number) {
  const { user } = yield* CurrentRequest;
  const database = yield* Database;
  const item = yield* database.findOneOrFail("shoppingListItem", (db) =>
    db.query.shoppingListItems.findFirst({
      where: eq(shoppingListItems.id, itemId),
      with: {
        shoppingList: {
          with: {
            group: {
              columns: { id: true },
              with: {
                groupMembers: {
                  where: and(
                    eq(groupMembers.userId, user.id),
                    eq(groupMembers.isActive, true),
                  ),
                },
              },
            },
          },
        },
      },
    }),
  );
  const member = yield* requireMemberIn(
    item.shoppingList.group.groupMembers,
    user.id,
    "errors.notGroupMember",
  );
  return { item, member };
});

// "operation" is what the legacy throw after an empty returning() surfaced as
export const firstReturned = <T>(rows: readonly T[]) => {
  const [row] = rows;
  return row === undefined
    ? fail.internalServer("operation")
    : Effect.succeed(row);
};
