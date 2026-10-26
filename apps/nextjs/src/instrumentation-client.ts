import { TRPCClientError } from "@trpc/client";

import { sendErrorReport } from "~/utils/error-beacon";

// The query and mutation caches report tRPC errors, and onRequestError the server errors that reach the browser with a digest
function reportedElsewhere(error: unknown) {
  return (
    error instanceof TRPCClientError ||
    (error instanceof Error && "digest" in error)
  );
}

// Next's built-in error boundaries rethrow through reportError, so render errors land here too
window.addEventListener("error", (event) => {
  // Cross-origin "Script error." and ResizeObserver loop notices carry no error
  if (!event.error || reportedElsewhere(event.error)) return;
  sendErrorReport(event.error, "onerror");
});

window.addEventListener("unhandledrejection", (event) => {
  if (reportedElsewhere(event.reason)) return;
  sendErrorReport(event.reason, "onunhandledrejection");
});
