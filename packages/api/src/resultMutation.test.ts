import { describe, expect, it, vi } from "vitest";

import type { ApiResult } from "./errors";
import { failureOf, resultMutation } from "./resultMutation";

const setup = () => {
  const callbacks = {
    rollback: vi.fn(),
    onFailure: vi.fn(),
    onSuccess: vi.fn(),
  };
  return {
    callbacks,
    mutation: resultMutation<string, number, string>(callbacks),
  };
};

const failed: ApiResult<string> = {
  success: false,
  error: {
    type: "ForbiddenError",
    message: "Nope",
    name: "ForbiddenError",
    details: {},
  },
};

describe("resultMutation", () => {
  it("rolls back and reports no message when the request throws", () => {
    const { callbacks, mutation } = setup();
    mutation.onError(new Error("offline"), 1, "snapshot");
    expect(callbacks.rollback).toHaveBeenCalledWith("snapshot");
    expect(callbacks.onFailure).toHaveBeenCalledWith(undefined);
    expect(callbacks.onSuccess).not.toHaveBeenCalled();
  });

  it("skips the rollback when onMutate never produced a context", () => {
    const { callbacks, mutation } = setup();
    mutation.onError(new Error("offline"), 1, undefined);
    expect(callbacks.rollback).not.toHaveBeenCalled();
    expect(callbacks.onFailure).toHaveBeenCalledWith(undefined);
  });

  it("rolls back and reports the server message on success: false", () => {
    const { callbacks, mutation } = setup();
    mutation.onSuccess(failed, 1, "snapshot");
    expect(callbacks.rollback).toHaveBeenCalledWith("snapshot");
    expect(callbacks.onFailure).toHaveBeenCalledWith("Nope");
    expect(callbacks.onSuccess).not.toHaveBeenCalled();
  });

  it("hands the unwrapped data to onSuccess and keeps the optimistic state", () => {
    const { callbacks, mutation } = setup();
    mutation.onSuccess({ success: true, data: "saved" }, 1, "snapshot");
    expect(callbacks.onSuccess).toHaveBeenCalledWith("saved", 1, "snapshot");
    expect(callbacks.rollback).not.toHaveBeenCalled();
    expect(callbacks.onFailure).not.toHaveBeenCalled();
  });
});

describe("failureOf", () => {
  it("prefers the server message, falls back for thrown errors, else undefined", () => {
    expect(failureOf({ data: failed, error: null }, "fallback")).toBe("Nope");
    expect(failureOf({ error: new Error("offline") }, "fallback")).toBe(
      "fallback",
    );
    expect(
      failureOf(
        { data: { success: true, data: "ok" }, error: null },
        "fallback",
      ),
    ).toBeUndefined();
  });
});
