import { Context, Effect, Layer } from "effect";

import { captureError } from "../../lib/posthog";

export class ErrorReporter extends Context.Service<
  ErrorReporter,
  {
    capture(report: Parameters<typeof captureError>[0]): Effect.Effect<void>;
  }
>()("@flatsby/api/effect/services/ErrorReporter") {
  static readonly layer = Layer.succeed(ErrorReporter, {
    capture: (report) => Effect.sync(() => captureError(report)),
  });
}
