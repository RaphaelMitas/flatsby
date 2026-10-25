import { Context, Effect, Layer } from "effect";

import { captureError } from "../../lib/posthog";

export class ErrorReporter extends Context.Service<
  ErrorReporter,
  {
    capture(report: Parameters<typeof captureError>[0]): Effect.Effect<void>;
  }
>()("@flatsby/api/effect/services/ErrorReporter") {
  static readonly layer = Layer.succeed(ErrorReporter, {
    // A failing report must never change the response it reports on
    capture: (report) =>
      Effect.sync(() => captureError(report)).pipe(Effect.ignoreCause),
  });
}
