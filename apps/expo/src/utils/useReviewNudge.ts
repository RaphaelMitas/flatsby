import { Platform } from "react-native";
import * as Application from "expo-application";
import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-react-native";

import { APP_STORE_ID, PLAY_STORE_ID } from "@flatsby/validators/store";

import { trpc } from "~/utils/api";
import { isE2ETestingEnabled } from "~/utils/e2e";

const ACTIONS_KEY = "review_nudge_actions";
const ASKED_AT_KEY = "review_nudge_asked_at";
const DAY_MS = 86_400_000;
const MIN_ACTIONS = 10;
const MIN_INSTALL_AGE_MS = 3 * DAY_MS;
const ASK_INTERVAL_MS = 120 * DAY_MS;

export type ReviewMoment = "list_cleared" | "expense_created";

export const writeReviewUrl =
  Platform.OS === "ios"
    ? `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`
    : `https://play.google.com/store/apps/details?id=${PLAY_STORE_ID}`;

// Counts every happy action, and asks the OS for a review only at a moment of success
export function useReviewNudge() {
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  return async (moment?: ReviewMoment) => {
    if (__DEV__ || isE2ETestingEnabled()) return;

    const actions = Number(await AsyncStorage.getItem(ACTIONS_KEY)) + 1;
    await AsyncStorage.setItem(ACTIONS_KEY, String(actions));
    if (!moment || actions < MIN_ACTIONS) return;

    const askedAt = Number(await AsyncStorage.getItem(ASKED_AT_KEY));
    if (Date.now() - askedAt < ASK_INTERVAL_MS) return;

    const installedAt = await Application.getInstallationTimeAsync();
    if (Date.now() - installedAt.getTime() < MIN_INSTALL_AGE_MS) return;

    const groups = await queryClient
      .fetchQuery(trpc.group.getUserGroups.queryOptions())
      .catch(() => null);
    if (!groups?.success || !groups.data.some((g) => g.memberCount >= 2))
      return;

    if (!(await StoreReview.hasAction())) return;

    await AsyncStorage.setItem(ASKED_AT_KEY, String(Date.now()));
    posthog.capture("review_prompt_requested", { moment, actions });
    await StoreReview.requestReview();
  };
}
