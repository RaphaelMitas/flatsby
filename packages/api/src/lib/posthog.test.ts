import type * as DrizzleErrors from "drizzle-orm/errors";
import { PostHog } from "posthog-node";
import { describe, expect, it } from "vitest";

import { browserExceptionProperties, withoutQueryParams } from "./posthog";

describe("browserExceptionProperties", () => {
  it("parses Safari and Firefox stacks", () => {
    const { $exception_list } = browserExceptionProperties({
      name: "TypeError",
      message: "undefined is not an object",
      stack: [
        "renderList@https://www.flatsby.com/_next/static/chunks/a.js:1:200",
        "@https://www.flatsby.com/_next/static/chunks/b.js:2:30",
      ].join("\n"),
      mechanism: "onerror",
    });
    expect($exception_list).toMatchObject([
      {
        type: "TypeError",
        value: "undefined is not an object",
        mechanism: { type: "onerror", handled: false },
        stacktrace: {
          frames: [
            { filename: "https://www.flatsby.com/_next/static/chunks/b.js" },
            {
              function: "renderList",
              filename: "https://www.flatsby.com/_next/static/chunks/a.js",
              lineno: 1,
              colno: 200,
            },
          ],
        },
      },
    ]);
  });

  it("leaves out the server's stack when the browser sent none", () => {
    const { $exception_list } = browserExceptionProperties({
      name: "Error",
      message: "Non-Error object thrown",
      mechanism: "onunhandledrejection",
    });
    expect($exception_list[0]?.stacktrace).toBeUndefined();
  });
});

describe("withoutQueryParams", () => {
  it("redacts the params of a query error from another drizzle copy", async () => {
    // Next bundles drizzle once per runtime, so a page's error isn't the class this module sees
    const copy: typeof DrizzleErrors = await import(
      /* @vite-ignore */ `${import.meta.resolve("drizzle-orm/errors")}?copy`
    );
    // Frames carry source lines, so a literal token would show up through them
    const token = crypto.randomUUID();
    const error = new Error("Failed to get session", {
      cause: new copy.DrizzleQueryError(
        'select "id" from "flat-cove_session" where "token" = $1',
        [token],
        new Error("password authentication failed"),
      ),
    });
    error.name = "APIError";

    const sent: unknown[] = [];
    const client = new PostHog("phc_test", {
      before_send: (event) => {
        sent.push(event);
        return null;
      },
    });
    client.captureException(withoutQueryParams(error));
    await client.shutdown();

    const payload = JSON.stringify(sent);
    expect(payload).toContain("Failed query: select");
    expect(payload).not.toContain(token);
  });
});
