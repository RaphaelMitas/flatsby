import { assert, describe, it } from "@effect/vitest";
import { Context, Effect, Layer, Ref } from "effect";
import { vi } from "vitest";

import type { NotFoundResource } from "../errors";
import { fail } from "../errors";
import { CurrentRequest } from "./services/CurrentRequest";
import { Database } from "./services/Database";
import { ErrorReporter } from "./services/ErrorReporter";
import {
  firstReturned,
  getListInGroupWithAccess,
  setLastUsed,
} from "./shoppingLists";
import { toApiResult } from "./toApiResult";

// The real client validates DATABASE_URL on import, which would fail a local run without env vars
vi.mock("@flatsby/db/client", () => ({ db: {} }));

class Lookups extends Context.Service<Lookups, Ref.Ref<NotFoundResource[]>>()(
  "test/Lookups",
) {}

const TestLayer = Layer.succeed(ErrorReporter, {
  capture: () => Effect.void,
}).pipe(
  Layer.provideMerge(
    Layer.succeed(CurrentRequest, {
      user: { id: "user-1" },
      locale: "de",
      path: "shoppingList.getShoppingListItems",
      requestId: "request-1",
    }),
  ),
  Layer.provideMerge(
    Layer.effect(
      Database,
      Effect.gen(function* () {
        const lookups = yield* Lookups;
        return Database.of({
          query: () => Effect.die(new Error("query is not expected")),
          findOneOrFail: (resource) =>
            Ref.update(lookups, (all) => [...all, resource]).pipe(
              Effect.andThen(fail.notFound(resource)),
            ),
        });
      }),
    ),
  ),
  Layer.provideMerge(Layer.effect(Lookups, Ref.make<NotFoundResource[]>([]))),
);

describe("getListInGroupWithAccess", () => {
  it.effect("refuses a non-member before looking up the list", () =>
    Effect.gen(function* () {
      const result = yield* toApiResult(getListInGroupWithAccess(1, 2));

      assert.isFalse(result.success);
      if (result.success) return;
      assert.strictEqual(
        result.error.details.messageKey,
        "errors.notFound.groupMembership",
      );
      assert.deepStrictEqual(yield* Ref.get(yield* Lookups), [
        "groupMembership",
      ]);
    }).pipe(Effect.provide(TestLayer)),
  );
});

describe("setLastUsed", () => {
  it.effect.each([
    { groupId: 1, shoppingListId: null, lookup: "groupMembership" },
    { groupId: 1, shoppingListId: 2, lookup: "groupMembership" },
    { groupId: null, shoppingListId: 2, lookup: "shoppingList" },
  ] satisfies {
    groupId: number | null;
    shoppingListId: number | null;
    lookup: NotFoundResource;
  }[])(
    "refuses groupId $groupId and list $shoppingListId without writing",
    ({ groupId, shoppingListId, lookup }) =>
      Effect.gen(function* () {
        const result = yield* toApiResult(setLastUsed(groupId, shoppingListId));

        assert.isFalse(result.success);
        if (result.success) return;
        assert.strictEqual(result.error.type, "NotFoundError");
        assert.deepStrictEqual(yield* Ref.get(yield* Lookups), [lookup]);
      }).pipe(Effect.provide(TestLayer)),
  );
});

describe("firstReturned", () => {
  it.effect("answers an empty returning() like the legacy throw did", () =>
    Effect.gen(function* () {
      const result = yield* toApiResult(firstReturned([]));

      assert.isFalse(result.success);
      if (result.success) return;
      assert.strictEqual(result.error.type, "InternalServerError");
      assert.strictEqual(result.error.details.operation, "operation");
    }).pipe(Effect.provide(TestLayer)),
  );
});
