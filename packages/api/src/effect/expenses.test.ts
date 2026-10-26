import { assert, describe, it } from "@effect/vitest";
import { Context, Effect, Layer, Ref } from "effect";

import { fail } from "../errors";
import { getExpenseWithAccess } from "./expenses";
import { CurrentRequest } from "./services/CurrentRequest";
import { Database } from "./services/Database";
import { ErrorReporter } from "./services/ErrorReporter";
import { toApiResult } from "./toApiResult";

type Report = Parameters<ErrorReporter["Service"]["capture"]>[0];

class Reports extends Context.Service<Reports, Ref.Ref<Report[]>>()(
  "test/Reports",
) {}

const TestLayer = Layer.effect(
  ErrorReporter,
  Effect.gen(function* () {
    const reports = yield* Reports;
    return ErrorReporter.of({
      capture: (report) => Ref.update(reports, (all) => [...all, report]),
    });
  }),
).pipe(
  Layer.provideMerge(Layer.effect(Reports, Ref.make<Report[]>([]))),
  Layer.provideMerge(
    Layer.succeed(CurrentRequest, {
      user: { id: "user-1" },
      locale: "de",
      path: "expense.getExpense",
      requestId: "request-1",
    }),
  ),
  Layer.provideMerge(
    Layer.succeed(
      Database,
      Database.of({
        query: () => Effect.die(new Error("query is not expected")),
        findOneOrFail: (resource) => fail.notFound(resource),
      }),
    ),
  ),
);

describe("getExpenseWithAccess", () => {
  it.effect("answers a missing expense with one NotFound report", () =>
    Effect.gen(function* () {
      const result = yield* toApiResult(getExpenseWithAccess(1));

      assert.isFalse(result.success);
      if (result.success) return;
      assert.strictEqual(result.error.type, "NotFoundError");
      assert.strictEqual(
        result.error.details.messageKey,
        "errors.notFound.expense",
      );
      const reports = yield* Ref.get(yield* Reports);
      assert.strictEqual(reports.length, 1);
    }).pipe(Effect.provide(TestLayer)),
  );
});
