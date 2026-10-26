import { Effect } from "effect";

import { eq } from "@flatsby/db";
import { expenses } from "@flatsby/db/schema";

import { requireMemberIn } from "./groups";
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
                columns: { userId: true, isActive: true },
              },
            },
          },
        },
      }),
    );
    yield* requireMemberIn(
      expense.group.groupMembers,
      user.id,
      "errors.noExpenseAccess",
    );
    return expense;
  },
);
