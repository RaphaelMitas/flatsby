import { PostHog } from "posthog-react-native";

import { redactInvitePath } from "@flatsby/validators/invite";

import { isE2ETestingEnabled } from "~/utils/e2e";

const posthogDisabled = isE2ETestingEnabled() || __DEV__;
const posthogApiKey = String(process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? "");
if (!posthogApiKey && !posthogDisabled)
  throw new Error("EXPO_PUBLIC_POSTHOG_API_KEY is not set");

export const posthog = new PostHog(posthogApiKey || "phc-disabled", {
  disabled: posthogDisabled,
  host: "https://eu.i.posthog.com",
  captureAppLifecycleEvents: true,
  before_send: [
    // The query and mutation caches report tRPC errors, so error boundaries and rejected mutateAsync calls would report them twice
    (event) =>
      event.event === "$exception" &&
      !event.properties?.trpc_path &&
      firstExceptionType(event.properties?.$exception_list) ===
        "TRPCClientError"
        ? null
        : event,
    // Deep links reach PostHog as screen paths and the "Application Opened" url
    (event) => ({
      ...event,
      properties:
        event.properties &&
        Object.fromEntries(
          Object.entries(event.properties).map(([key, value]) => [
            key,
            typeof value === "string" ? redactInvitePath(value) : value,
          ]),
        ),
    }),
  ],
  errorTracking: {
    autocapture: {
      uncaughtExceptions: true,
      unhandledRejections: true,
      console: ["error"],
    },
  },
});

function firstExceptionType(exceptionList: unknown) {
  const first: unknown = Array.isArray(exceptionList)
    ? exceptionList[0]
    : undefined;
  return typeof first === "object" && first !== null && "type" in first
    ? first.type
    : undefined;
}
