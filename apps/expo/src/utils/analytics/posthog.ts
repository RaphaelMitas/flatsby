import type { PostHogCustomStorage } from "posthog-react-native";
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

const POSTHOG_FILE = ".posthog-rn.json";
const POSTHOG_FILES = [POSTHOG_FILE, ".posthog-rn-logs.json"];

let consent = false;

interface Client {
  posthog: PostHog;
  lease: { active: boolean };
}

function fileStorage(lease: Client["lease"]): PostHogCustomStorage {
  return {
    getItem: (key) => {
      const file = new File(Paths.document, key);
      return file.exists ? file.text() : null;
    },
    setItem: async (key, value) => {
      if (lease.active) await new File(Paths.document, key).write(value);
    },
  };
}

function createClient(persistent: boolean): Client {
  const lease = { active: persistent };
  const posthog = new PostHog(posthogApiKey || "phc-disabled", {
    disabled: posthogDisabled,
    host: "https://eu.i.posthog.com",
    persistence: persistent ? "file" : "memory",
    customStorage: fileStorage(lease),
    captureAppLifecycleEvents: persistent,
    disableRemoteFeatureFlags: true,
    before_send: [
      (event) => (consent || event.event === "$exception" ? event : null),
      (event) =>
        event.event === "$exception" &&
        !event.properties?.trpc_path &&
        firstExceptionType(event.properties?.$exception_list) ===
          "TRPCClientError"
          ? null
          : event,
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
  return { posthog, lease };
}

let applied = false;
let current = createClient(applied);
let queue = Promise.resolve();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getPostHog = () => current.posthog;
export const getAnalyticsConsent = () => applied;
export const usePostHogClient = () =>
  useSyncExternalStore(subscribe, getPostHog);

export const consentedSessionId = () =>
  consent && applied ? current.posthog.getSessionId() || null : null;

export function applyConsent(next: boolean) {
  consent = next;
  queue = queue.then(() => apply(consent)).catch(console.error);
}

async function apply(persistent: boolean) {
  if (persistent !== applied) {
    const previous = current;
    applied = persistent;
    current = createClient(persistent);
    for (const listener of listeners) listener();
    previous.lease.active = false;
    if (!persistent) previous.posthog.reset();
    void previous.posthog.optOut();
    await previous.posthog.shutdown();
  }
  if (!persistent) deletePostHogFiles();
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

export async function keepOnlyLegacyOptOut() {
  await new File(Paths.document, POSTHOG_FILE).write(
    JSON.stringify({ version: "v1", content: { opted_out: true } }),
  );
}

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
