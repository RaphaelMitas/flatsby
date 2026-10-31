import { Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import Icon from "~/lib/ui/custom/icons/Icon";
import { cn } from "~/lib/utils";
import { analyticsPrompt, consentChoice } from "~/utils/analytics/consent";
import { trpc } from "~/utils/api";
import { isE2ETestingEnabled } from "~/utils/e2e";
import { useAnalyticsConsentSheet } from "./useAnalyticsConsentSheet";

// The notice and the invitation never share a launch
let noticeDismissedThisLaunch = false;

export function AnalyticsPrompt({ className }: { className?: string }) {
  const t = useTranslations("settings.analytics");
  const prompt = analyticsPrompt.useValue();
  const choice = consentChoice.useValue();
  const { data: user } = useQuery(trpc.user.getCurrentUser.queryOptions());
  const { open, sheet } = useAnalyticsConsentSheet();

  if (isE2ETestingEnabled()) return null;

  const dismiss = (testID: string, onPress: () => void) => (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={t("dismiss")}
      hitSlop={8}
      onPress={onPress}
    >
      <Icon name="x" size={18} color="muted-foreground" />
    </Pressable>
  );

  const rowClass = cn(
    "bg-muted flex-row items-center gap-3 rounded-xl px-4 py-3",
    className,
  );

  if (prompt === "notice" && user && !user.analyticsOptOut) {
    return (
      <View testID="analytics-notice" className={rowClass}>
        <Text className="text-foreground flex-1 text-sm">
          {t.rich("rightToObject", {
            strong: (chunks) => <Text className="font-semibold">{chunks}</Text>,
          })}
        </Text>
        {dismiss("analytics-notice-dismiss", () => {
          noticeDismissedThisLaunch = true;
          analyticsPrompt.save("invite");
        })}
      </View>
    );
  }

  const showInvite =
    prompt === "invite" && choice === "none" && !noticeDismissedThisLaunch;

  return (
    <>
      {showInvite && (
        <View testID="analytics-invite" className={rowClass}>
          <Pressable
            className="flex-1 flex-row items-center justify-between gap-3"
            onPress={() => {
              analyticsPrompt.save("done");
              open();
            }}
          >
            <Text className="text-foreground flex-1 text-sm">
              {t("invite")}
            </Text>
            <Text className="text-foreground text-sm font-semibold">
              {t("inviteAction")} ›
            </Text>
          </Pressable>
          {dismiss("analytics-invite-dismiss", () =>
            analyticsPrompt.save("done"),
          )}
        </View>
      )}
      {sheet}
    </>
  );
}
