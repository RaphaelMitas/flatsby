import type { AnalyticsConsent } from "@flatsby/validators/user";
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
import {
  consentChoice,
  consentOf,
  useSaveAnalyticsConsent,
} from "~/utils/analytics/consent";
import { trpc } from "~/utils/api";
import { openLegalPage } from "~/utils/legal";

export default function AnalyticsSettings() {
  const t = useTranslations("settings.analytics");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const userQuery = trpc.user.getCurrentUser;
  const { data: user } = useSuspenseQuery(userQuery.queryOptions());
  const consent = consentOf(consentChoice.useValue() ?? "none");
  const save = useSaveAnalyticsConsent();
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

  // Turning one on goes through the sheet, so consent is always given with the full information
  const toggle = (key: keyof AnalyticsConsent, on: boolean) => {
    const next = { ...consent, [key]: on };
    if (on) open(next);
    else save(next);
  };

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
          onPress={() => toggle("screens", !consent.screens)}
          rightContent={
            <Switch
              checked={consent.screens}
              onCheckedChange={(on) => toggle("screens", on)}
            />
          }
        />
        <SettingsItem
          testID="analytics-recordings"
          title={t("recordings")}
          subtitle={t("recordingsBody")}
          iconName="video"
          onPress={() => toggle("recordings", !consent.recordings)}
          rightContent={
            <Switch
              checked={consent.recordings}
              onCheckedChange={(on) => toggle("recordings", on)}
            />
          }
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
