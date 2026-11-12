import type * as DrizzleErrors from "drizzle-orm/errors";
import { PostHog } from "posthog-node";
import { describe, expect, it } from "vitest";

import {
  browserExceptionProperties,
  clientProperties,
  withoutQueryParams,
} from "./posthog";

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

describe("clientProperties", () => {
  const sessionId = "019a7c3e-5b2a-7d1f-9c4e-2f8a6b1d3e5c";

  it("attributes an app request to its platform, version and session", () => {
    expect(
      clientProperties(
        new Headers({
          "x-trpc-source": "expo-react",
          "x-os-name": "Android",
          "x-app-version": "0.19.0",
          "x-app-build": "74",
          "x-expo-update-id": sessionId,
          "x-posthog-session-id": sessionId,
        }),
      ),
    ).toEqual({
      client: "expo-react",
      $os: "Android",
      $os_name: "Android",
      $device_type: "Mobile",
      $app_version: "0.19.0",
      $app_build: "74",
      $expo_update_id: sessionId,
      $session_id: sessionId,
    });
  });

  it("drops app headers that don't parse", () => {
    expect(
      clientProperties(
        new Headers({
          "x-trpc-source": "x".repeat(10_000),
          "x-os-name": "Windows",
          "x-app-version": "",
          "x-posthog-session-id": "not-a-session",
        }),
      ),
    ).toEqual({});
  });
});
