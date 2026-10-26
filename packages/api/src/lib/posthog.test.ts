import { describe, expect, it } from "vitest";

import { browserExceptionProperties } from "./posthog";

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
