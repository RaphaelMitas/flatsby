import { Linking } from "react-native";
import { Link } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { SettingsHeader } from "~/components/settings/SettingsHeader";
import { SettingsItem } from "~/components/settings/SettingsItem";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth/auth-client";
import { passkeysSupported } from "~/utils/auth/passkey-device";
import { getBaseUrl } from "~/utils/base-url";

export default function AccountScreen() {
  const t = useTranslations();
  const { data: user } = useSuspenseQuery(
    trpc.user.getCurrentUser.queryOptions(),
  );
  const passkeyCount = authClient.useListPasskeys().data?.length ?? 0;

  return (
    <SafeAreaView>
      <AppScrollView>
        <SettingsHeader title={user.name} />
        <SettingsSection>
          <Link href="/settings/profile" asChild>
            <SettingsItem
              title={t("navigation.profile")}
              subtitle={t("settings.items.profileSubtitle")}
              iconName="user"
            />
          </Link>
          {passkeysSupported && (
            <Link href="/settings/passkeys" asChild>
              <SettingsItem
                testID="settings-passkeys"
                title={t("settings.passkeys.title")}
                value={String(passkeyCount)}
                iconName="passkey"
              />
            </Link>
          )}
        </SettingsSection>
        <SettingsSection className="pb-4">
          <SettingsItem
            title={t("settings.items.exportData")}
            iconName="download"
            onPress={() => Linking.openURL(`${getBaseUrl()}/user-settings`)}
          />
          <Link href="/settings/danger" asChild>
            <SettingsItem
              testID="settings-delete-account"
              title={t("settings.items.deleteAccount")}
              iconName="trash-2"
              variant="destructive"
            />
          </Link>
        </SettingsSection>
      </AppScrollView>
    </SafeAreaView>
  );
}
