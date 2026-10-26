import type { Instrumentation } from "next";

import { captureError, posthog } from "@flatsby/api/posthog";

export const onRequestError: Instrumentation.onRequestError = (
  error,
  _request,
  context,
) => {
  captureError({
    error,
    operation: `next.${context.routeType}`,
    additionalProperties: {
      route: context.routePath,
      render_source: context.renderSource,
    },
  });
  // Next holds a failing route's response until this returns, so send without waiting
  void posthog?.flush();
};
