import type { Passkey } from "@better-auth/passkey/client";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";
import { useFormatter, useTranslations } from "use-intl";

import { usePasskey } from "@flatsby/validators/usePasskey";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import { Card } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Input } from "~/lib/ui/input";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { cn } from "~/lib/utils";
import { authClient } from "~/utils/auth/auth-client";
import { passkeyDevice } from "~/utils/auth/passkey-device";

export default function PasskeysScreen() {
  const t = useTranslations();
  const posthog = usePostHog();
  const { data: passkeys, isPending } = authClient.useListPasskeys();
  const add = usePasskey({
    run: () => authClient.passkey.addPasskey(),
    onDone: () => {
      passkeyDevice.save("used");
      posthog.capture("passkey_created", { source: "settings" });
    },
  });

  if (isPending) return <SafeAreaView />;

  const addButton = (
    <Button
      testID="passkeys-add-button"
      variant={passkeys?.length ? "outline" : "primary"}
      className="w-full py-4"
      title={
        passkeys?.length
          ? t("settings.passkeys.add")
          : t("settings.passkeys.create")
      }
      icon={add.busy ? "loader" : undefined}
      disabled={add.busy}
      onPress={() => add.start()}
    />
  );
  const addError = add.error && (
    <Text className="text-destructive text-center text-sm">{t(add.error)}</Text>
  );

  if (!passkeys?.length) {
    return (
      <SafeAreaView>
        <AppScrollView contentContainerClassName="flex-grow justify-center gap-4 p-6">
          <View testID="passkeys-empty" className="items-center gap-3">
            <Icon name="passkey" size={56} color="primary" />
            <Text className="text-foreground text-lg font-bold">
              {t("settings.passkeys.emptyTitle")}
            </Text>
            <Text className="text-muted-foreground text-center text-base">
              {t("settings.passkeys.emptyBody")}
            </Text>
          </View>
          {addError}
          {addButton}
        </AppScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <AppScrollView contentContainerClassName="gap-4 p-4">
        <Text className="text-muted-foreground text-sm">
          {t("settings.passkeys.description")}
        </Text>
        <Card className="px-4">
          {passkeys.map((passkey, index) => (
            <PasskeyRow
              key={passkey.id}
              passkey={passkey}
              divider={index < passkeys.length - 1}
            />
          ))}
        </Card>
        {addError}
        {addButton}
      </AppScrollView>
    </SafeAreaView>
  );
}

function PasskeyRow({
  passkey,
  divider,
}: {
  passkey: Passkey;
  divider: boolean;
}) {
  const t = useTranslations();
  const format = useFormatter();
  const name = passkey.name ?? t("settings.passkeys.unnamed");
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const change = async (
    request: () => Promise<{ error: unknown }>,
    onSuccess?: () => void,
  ) => {
    setBusy(true);
    const { error } = await request().catch((thrown: unknown) => ({
      error: thrown,
    }));
    setBusy(false);
    if (error) Alert.alert(t("common.error"), t("auth.passkey.failed"));
    else onSuccess?.();
  };

  const rename = () => {
    const next = draft?.trim();
    if (!next) return;
    void change(
      () => authClient.passkey.updatePasskey({ id: passkey.id, name: next }),
      () => setDraft(null),
    );
  };

  const confirmRemove = () =>
    Alert.alert(
      t("settings.passkeys.removeTitle"),
      t("settings.passkeys.removeBody", { name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.passkeys.remove"),
          style: "destructive",
          onPress: () =>
            void change(() =>
              authClient.passkey.deletePasskey({ id: passkey.id }),
            ),
        },
      ],
    );

  const showActions = () =>
    Alert.alert(name, undefined, [
      {
        text: t("settings.passkeys.rename"),
        onPress: () => setDraft(passkey.name ?? ""),
      },
      {
        text: t("settings.passkeys.remove"),
        style: "destructive",
        onPress: confirmRemove,
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);

  if (draft !== null) {
    return (
      <View
        className={cn(
          "flex-row items-center gap-3 py-3",
          divider && "border-border border-b",
        )}
      >
        <Input
          testID="passkey-name-input"
          className="flex-1"
          autoFocus
          value={draft}
          maxLength={64}
          placeholder={t("settings.passkeys.namePlaceholder")}
          accessibilityLabel={t("settings.passkeys.namePlaceholder")}
          onChangeText={setDraft}
          returnKeyType="done"
          onSubmitEditing={rename}
        />
        <Button
          testID="passkey-name-save"
          title={t("settings.passkeys.save")}
          disabled={busy || !draft.trim()}
          onPress={rename}
        />
      </View>
    );
  }

  return (
    <View
      testID="passkey-row"
      className={cn(
        "flex-row items-center gap-3 py-3",
        divider && "border-border border-b",
      )}
    >
      <Icon name="passkey" size={20} color="muted-foreground" />
      <View className="flex-1">
        <Text className="text-foreground text-base font-medium">{name}</Text>
        {passkey.createdAt && (
          <Text className="text-muted-foreground text-sm">
            {t("settings.passkeys.created", {
              date: format.dateTime(new Date(passkey.createdAt), {
                dateStyle: "medium",
              }),
            })}
          </Text>
        )}
      </View>
      <Pressable
        testID="passkey-actions"
        accessibilityRole="button"
        accessibilityLabel={t("settings.passkeys.actions")}
        disabled={busy}
        hitSlop={12}
        onPress={showActions}
      >
        <Icon
          name={busy ? "loader" : "ellipsis"}
          size={20}
          color="muted-foreground"
        />
      </Pressable>
    </View>
  );
}
