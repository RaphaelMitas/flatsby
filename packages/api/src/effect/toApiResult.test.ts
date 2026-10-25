import { assert, describe, it } from "@effect/vitest";
import { Cause, Context, Effect, Layer, Ref } from "effect";

import { translatorFor } from "@flatsby/i18n/translator";

import { Errors } from "../errors";
import { CurrentRequest } from "./services/CurrentRequest";
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
      path: "group.getGroup",
      requestId: "request-1",
    }),
  ),
);

describe("toApiResult", () => {
  it.effect("returns data and reports nothing on success", () =>
    Effect.gen(function* () {
      const result = yield* toApiResult(Effect.succeed({ groupId: 1 }));

      assert.deepStrictEqual(result, { success: true, data: { groupId: 1 } });
      assert.deepStrictEqual(yield* Ref.get(yield* Reports), []);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("translates a failure and reports it as expected", () =>
    Effect.gen(function* () {
      const result = yield* toApiResult(
        Effect.fail(Errors.notFound("group", 7)),
      );

      assert.isFalse(result.success);
      if (result.success) return;
      assert.strictEqual(result.error.type, "NotFoundError");
      assert.strictEqual(
        result.error.message,
        translatorFor("de")("errors.notFound.group"),
      );
      assert.deepStrictEqual(result.error.details, {
        messageKey: "errors.notFound.group",
        identifier: 7,
      });

      const reports = yield* Ref.get(yield* Reports);
      assert.strictEqual(reports.length, 1);
      assert.strictEqual(reports[0]?.operation, "group.getGroup");
      assert.strictEqual(reports[0]?.distinctId, "user-1");
      assert.deepStrictEqual(reports[0]?.additionalProperties, {
        kind: "expected",
        requestId: "request-1",
        error_type: "NotFoundError",
        message_key: "errors.notFound.group",
        $exception_fingerprint:
          "group.getGroup:NotFoundError:errors.notFound.group",
        $issue_name: "group.getGroup NotFoundError",
      });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("turns a defect into InternalServerError and reports it", () =>
    Effect.gen(function* () {
      const defect = new Error("Group not found");
      const result = yield* toApiResult(
        Effect.sync(() => {
          throw defect;
        }),
      );

      assert.isFalse(result.success);
      if (result.success) return;
      assert.strictEqual(result.error.type, "InternalServerError");
      assert.strictEqual(
        result.error.message,
        translatorFor("de")("errors.unexpected"),
      );

      const reports = yield* Ref.get(yield* Reports);
      assert.strictEqual(reports.length, 1);
      assert.strictEqual(reports[0]?.error, defect);
      assert.deepStrictEqual(reports[0]?.additionalProperties, {
        kind: "defect",
        requestId: "request-1",
      });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect("answers and reports a failure plus a defect as the failure", () =>
    Effect.gen(function* () {
      const failure = Errors.forbidden("errors.mustBeAdmin");
      const result = yield* toApiResult(
        Effect.failCause(
          Cause.combine(Cause.fail(failure), Cause.die(new Error("boom"))),
        ),
      );

      assert.isFalse(result.success);
      if (result.success) return;
      assert.strictEqual(result.error.type, "ForbiddenError");
      const reports = yield* Ref.get(yield* Reports);
      assert.strictEqual(reports.length, 1);
      assert.strictEqual(reports[0]?.error, failure);
    }).pipe(Effect.provide(TestLayer)),
  );
});
