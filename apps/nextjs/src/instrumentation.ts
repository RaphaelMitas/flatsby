import type { Instrumentation } from "next";

import { captureError } from "@flatsby/api/posthog";

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
};
