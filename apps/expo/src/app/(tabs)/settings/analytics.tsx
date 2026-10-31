import { Text } from "react-native";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import { useAnalyticsConsentSheet } from "~/components/analytics/useAnalyticsConsentSheet";
import { SettingsItem } from "~/components/settings/SettingsItem";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Switch } from "~/lib/ui/switch";
import { useAnalyticsConsent } from "~/utils/analytics/consent";
import { trpc } from "~/utils/api";
import { openLegalPage } from "~/utils/legal";

export default function AnalyticsSettings() {
  const t = useTranslations("settings.analytics");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const userQuery = trpc.user.getCurrentUser;
  const { data: user } = useSuspenseQuery(userQuery.queryOptions());
  const consent = useAnalyticsConsent();
  const { open, sheet } = useAnalyticsConsentSheet();

  const setOptOut = useMutation(
    trpc.user.setAnalyticsOptOut.mutationOptions({
      onMutate: async ({ optOut }) => {
        await queryClient.cancelQueries(userQuery.queryFilter());
        queryClient.setQueryData(userQuery.queryKey(), (old) =>
          old ? { ...old, analyticsOptOut: optOut } : old,
        );
      },
      onSettled: () => queryClient.invalidateQueries(userQuery.queryFilter()),
    }),
  );

  const usageOn = !user.analyticsOptOut;

  return (
    <AppScrollView>
      <SettingsSection title={t("title")}>
        <SettingsItem
          testID="analytics-usage"
          title={t("usage")}
          subtitle={t("usageBody")}
          iconName="activity"
          onPress={() => setOptOut.mutate({ optOut: usageOn })}
          rightContent={
            <Switch
              checked={usageOn}
              onCheckedChange={(on) => setOptOut.mutate({ optOut: !on })}
            />
          }
        />
      </SettingsSection>
      <SettingsSection title={t("consentSection")}>
        <SettingsItem
          testID="analytics-screens"
          title={t("screens")}
          subtitle={t("screensBody")}
          iconName="smartphone"
          onPress={open}
          rightContent={<Switch checked={consent} onCheckedChange={open} />}
        />
      </SettingsSection>
      <Text className="text-muted-foreground px-4 py-3 text-sm">
        {t.rich("footer", {
          link: (chunks) => (
            <Text
              className="underline"
              onPress={() => openLegalPage(locale, "privacy", "analytics")}
            >
              {chunks}
            </Text>
          ),
        })}
      </Text>
      {sheet}
    </AppScrollView>
  );
}
