import { QueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { describe, expect, it } from "vitest";

import type { TRPCFailure } from "./trpcFailure";
import { trpcFailureCaches, trpcFailureProperties } from "./trpcFailure";

function serverError(code: string, httpStatus: number) {
  return new TRPCClientError(code, {
    result: {
      error: { code: -32600, message: code, data: { code, httpStatus } },
    },
  });
}

async function failQuery(error: Error, input: unknown) {
  const reports: TRPCFailure[] = [];
  const client = new QueryClient({
    ...trpcFailureCaches((_error, failure) => reports.push(failure)),
  });
  await client
    .fetchQuery({
      queryKey: [["group", "getGroup"], { input, type: "query" }],
      queryFn: () => Promise.reject(error),
      retry: false,
    })
    .catch(() => undefined);
  return reports;
}

describe("trpcFailureCaches", () => {
  it("reports a failed query with its code and only the valid ID inputs", async () => {
    const reports = await failQuery(serverError("NOT_FOUND", 404), {
      groupId: 7,
      memberId: "m-1",
      shoppingListId: Number.NaN,
      name: "Flat",
    });
    expect(reports).toEqual([
      {
        path: "group.getGroup",
        type: "query",
        code: "NOT_FOUND",
        httpStatus: 404,
        inputIds: { groupId: 7, memberId: "m-1" },
        attempts: 1,
        hadCachedData: false,
      },
    ]);
  });

  it("skips signed-out and non-tRPC errors", async () => {
    expect(await failQuery(serverError("UNAUTHORIZED", 401), {})).toEqual([]);
    expect(await failQuery(new Error("boom"), {})).toEqual([]);
  });

  it("tells an unreadable answer from no answer", async () => {
    const [unreachable] = await failQuery(
      new TRPCClientError("Failed to fetch"),
      {},
    );
    expect(unreachable?.code).toBeUndefined();
    const [unreadable] = await failQuery(
      new TRPCClientError("Unexpected token", {
        meta: { response: new Response("<html>") },
      }),
      {},
    );
    expect(unreadable?.code).toBe("UNREADABLE_RESPONSE");
    const [streamed] = await failQuery(
      TRPCClientError.from(new SyntaxError("Unexpected token '<'")),
      {},
    );
    expect(streamed?.code).toBe("UNREADABLE_RESPONSE");
  });

  it("counts the final mutation attempt", async () => {
    const reports: TRPCFailure[] = [];
    const client = new QueryClient({
      ...trpcFailureCaches((_error, failure) => reports.push(failure)),
    });
    await client
      .getMutationCache()
      .build(client, {
        mutationKey: [["expense", "createExpense"]],
        mutationFn: () => Promise.reject(serverError("BAD_REQUEST", 400)),
      })
      .execute({ groupId: 3, description: "Groceries" })
      .catch(() => undefined);
    expect(reports).toMatchObject([
      {
        path: "expense.createExpense",
        type: "mutation",
        inputIds: { groupId: 3 },
        attempts: 1,
      },
    ]);
  });
});

describe("trpcFailureProperties", () => {
  it("groups failures by procedure and code", () => {
    const failure: TRPCFailure = {
      path: "group.getGroup",
      type: "query",
      code: "INTERNAL_SERVER_ERROR",
      inputIds: {},
      attempts: 4,
    };
    expect(trpcFailureProperties(failure)).toMatchObject({
      $exception_fingerprint: "trpc:group.getGroup:INTERNAL_SERVER_ERROR",
      $issue_name: "group.getGroup INTERNAL_SERVER_ERROR",
    });
    expect(
      trpcFailureProperties({ ...failure, code: undefined }),
    ).toMatchObject({
      $exception_fingerprint: "trpc:unreachable",
      $issue_name: "API unreachable",
    });
  });
});
