import { Platform } from "react-native";
import * as Application from "expo-application";
import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-react-native";

import { APP_STORE_URL, PLAY_STORE_URL } from "@flatsby/validators/store";

import { trpc } from "~/utils/api";
import { isE2ETestingEnabled } from "~/utils/e2e";

const ACTIONS_KEY = "review_nudge_actions";
const ASKED_AT_KEY = "review_nudge_asked_at";
const DAY_MS = 86_400_000;
const MIN_ACTIONS = 10;
const MIN_INSTALL_AGE_MS = 3 * DAY_MS;
const ASK_INTERVAL_MS = 120 * DAY_MS;

export type ReviewMoment = "list_cleared" | "expense_created";

// Play has no deep link to the review form
export const writeReviewUrl =
  Platform.OS === "ios"
    ? `${APP_STORE_URL}?action=write-review`
    : PLAY_STORE_URL;

export function useReviewNudge() {
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  const nudge = async (moment?: ReviewMoment) => {
    if (__DEV__ || isE2ETestingEnabled()) return;

    const actions = Number(await AsyncStorage.getItem(ACTIONS_KEY)) + 1;
    await AsyncStorage.setItem(ACTIONS_KEY, String(actions));
    if (!moment || actions < MIN_ACTIONS) return;

    const askedAt = Number(await AsyncStorage.getItem(ASKED_AT_KEY));
    if (Date.now() - askedAt < ASK_INTERVAL_MS) return;

    const installedAt = await Application.getInstallationTimeAsync();
    if (Date.now() - installedAt.getTime() < MIN_INSTALL_AGE_MS) return;

    const groups = await queryClient.ensureQueryData(
      trpc.group.getUserGroups.queryOptions(),
    );
    if (!groups.success || !groups.data.some((g) => g.memberCount >= 2)) return;

    if (!(await StoreReview.hasAction())) return;

    await AsyncStorage.setItem(ASKED_AT_KEY, String(Date.now()));
    await StoreReview.requestReview();
    posthog.capture("review_prompt_requested", { moment, actions });
  };

  // A missed nudge is harmless, so no failure should reach error tracking
  return (moment?: ReviewMoment) => nudge(moment).catch(() => undefined);
}
