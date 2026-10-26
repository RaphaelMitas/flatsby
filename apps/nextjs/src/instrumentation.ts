import type { Instrumentation } from "next";

import { captureError, posthog } from "@flatsby/api/posthog";

export const onRequestError: Instrumentation.onRequestError = async (
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
  await posthog?.flush();
};
