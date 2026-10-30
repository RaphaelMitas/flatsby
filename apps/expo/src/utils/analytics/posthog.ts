import type { AnalyticsConsent } from "@flatsby/validators/user";
import { useSyncExternalStore } from "react";
import { File, Paths } from "expo-file-system";
import { PostHog } from "posthog-react-native";
import { z } from "zod/v4";

import { redactInvitePath } from "@flatsby/validators/invite";

import { isE2ETestingEnabled } from "~/utils/e2e";

const posthogDisabled = isE2ETestingEnabled() || __DEV__;
const posthogApiKey = String(process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? "");
if (!posthogApiKey && !posthogDisabled)
  throw new Error("EXPO_PUBLIC_POSTHOG_API_KEY is not set");

// Where posthog-react-native's file persistence keeps the device ID, the queue and the opt-out
const POSTHOG_FILE = ".posthog-rn.json";
const POSTHOG_FILES = [POSTHOG_FILE, ".posthog-rn-logs.json"];

let consent: AnalyticsConsent = { screens: false, recordings: false };

export const storesDeviceId = ({ screens, recordings }: AnalyticsConsent) =>
  screens || recordings;

// Without consent only crash reports leave the phone; recordings alone still carry the account link
function isAllowed(event: string) {
  if (consent.screens || event === "$exception") return true;
  return consent.recordings && (event === "$snapshot" || event === "$identify");
}

function createClient() {
  const persistent = storesDeviceId(consent);
  return new PostHog(posthogApiKey || "phc-disabled", {
    disabled: posthogDisabled,
    host: "https://eu.i.posthog.com",
    // Memory keeps the ID off the device, and keeps the native plugin from starting before consent
    persistence: persistent ? "file" : "memory",
    captureAppLifecycleEvents: persistent,
    preloadFeatureFlags: false,
    sessionReplayConfig: {
      maskAllTextInputs: true,
      maskAllImages: true,
      // Logs can hold what users typed, and request URLs carry tRPC inputs
      captureLog: false,
      captureNetworkTelemetry: false,
    },
    before_send: [
      (event) => (isAllowed(event.event) ? event : null),
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
      },
    },
  });
}

let client = createClient();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getPostHog = () => client;
export const getAnalyticsConsent = () => consent;
export const usePostHogClient = () =>
  useSyncExternalStore(subscribe, getPostHog);

// Persistence is fixed when a client is created, so giving or withdrawing consent swaps the client
export async function applyConsent(next: AnalyticsConsent) {
  const previous = client;
  const wasRecording = consent.recordings;
  const swap = storesDeviceId(next) !== storesDeviceId(consent);
  consent = next;

  if (wasRecording && !next.recordings) await previous.stopSessionRecording();
  if (swap) {
    client = createClient();
    for (const listener of listeners) listener();
    await previous.shutdown();
    if (!storesDeviceId(next)) deletePostHogFiles();
  }
  if (next.recordings && (!wasRecording || swap))
    await client.startSessionRecording();
}

export function deletePostHogFiles() {
  for (const name of POSTHOG_FILES) {
    const file = new File(Paths.document, name);
    if (file.exists) file.delete();
  }
}

const legacyFileSchema = z.object({
  content: z.object({ opted_out: z.boolean().optional() }),
});

/** What builds from before consent left in the SDK's file, read before it gets deleted */
export async function readLegacyPostHogFile() {
  const file = new File(Paths.document, POSTHOG_FILE);
  if (!file.exists) return { existed: false, optedOut: false };
  try {
    const parsed = legacyFileSchema.safeParse(JSON.parse(await file.text()));
    return {
      existed: true,
      optedOut: parsed.success && parsed.data.content.opted_out === true,
    };
  } catch {
    return { existed: true, optedOut: false };
  }
}

function firstExceptionType(exceptionList: unknown) {
  const first: unknown = Array.isArray(exceptionList)
    ? exceptionList[0]
    : undefined;
  return typeof first === "object" && first !== null && "type" in first
    ? first.type
    : undefined;
}
