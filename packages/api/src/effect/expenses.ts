import { Effect } from "effect";

import { eq } from "@flatsby/db";
import { expenses } from "@flatsby/db/schema";

import { DbUtils } from "../utils";
import { CurrentRequest } from "./services/CurrentRequest";
import { Database } from "./services/Database";

export const getExpenseWithAccess = Effect.fn("Expenses.getExpenseWithAccess")(
  function* (expenseId: number) {
    const { user } = yield* CurrentRequest;
    const database = yield* Database;
    const expense = yield* database.findOneOrFail("expense", (db) =>
      db.query.expenses.findFirst({
        where: eq(expenses.id, expenseId),
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
    );
    yield* DbUtils.ensureGroupMember(
      user.id,
      expense.group.groupMembers,
      "errors.noExpenseAccess",
    );
    return expense;
  },
);
