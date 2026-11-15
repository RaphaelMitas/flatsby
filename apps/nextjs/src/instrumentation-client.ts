import { TRPCClientError } from "@trpc/client";

import { sendErrorReport } from "~/utils/error-beacon";

function reportedElsewhere(error: unknown) {
  return (
    error instanceof TRPCClientError ||
    (error instanceof Error && "digest" in error)
  );
}

window.addEventListener("error", (event) => {
  if (!event.error || reportedElsewhere(event.error)) return;
  sendErrorReport(event.error, "onerror");
});

window.addEventListener("unhandledrejection", (event) => {
  if (reportedElsewhere(event.reason)) return;
  sendErrorReport(event.reason, "onunhandledrejection");
});
