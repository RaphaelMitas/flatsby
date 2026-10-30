import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

import { requireMemberIn } from "./groups";

vi.mock("@flatsby/db/client", () => ({ db: {} }));

describe("requireMemberIn", () => {
  it("never resolves a placeholder as the acting member", async () => {
    const placeholder = { id: 2, userId: null, isActive: true };

    const result = await Effect.runPromise(
      Effect.result(
        requireMemberIn([placeholder], "user-1", "errors.mustBeGroupMember"),
      ),
    );

    expect(result._tag).toBe("Failure");
  });
});
