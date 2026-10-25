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
  // PostHogProvider only defaults this on when it builds the client itself
  captureAppLifecycleEvents: true,
  // Deep links reach PostHog as screen paths and the "Application Opened" url
  before_send: (event) =>
    event && {
      ...event,
      properties:
        event.properties &&
        Object.fromEntries(
          Object.entries(event.properties).map(([key, value]) => [
            key,
            typeof value === "string" ? redactInvitePath(value) : value,
          ]),
        ),
    },
  errorTracking: {
    autocapture: {
      uncaughtExceptions: true,
      unhandledRejections: true,
      console: ["error"],
    },
  },
});
