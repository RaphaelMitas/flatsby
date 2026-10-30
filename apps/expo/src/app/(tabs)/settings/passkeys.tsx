import type { Passkey } from "@better-auth/passkey/client";
import { Alert, Pressable, Text, View } from "react-native";
import { useFormatter, useTranslations } from "use-intl";

import {
  PASSKEY_NAME_MAX_LENGTH,
  usePasskeyRow,
} from "@flatsby/validators/usePasskey";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import { Card } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Input } from "~/lib/ui/input";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { cn } from "~/lib/utils";
import { authClient } from "~/utils/auth/auth-client";
import { useAddPasskey } from "~/utils/auth/passkey-device";

export default function PasskeysScreen() {
  const t = useTranslations();
  const { data: passkeys, isPending, error } = authClient.useListPasskeys();
  const add = useAddPasskey("settings");

  if (isPending) return <SafeAreaView />;

  if (error) {
    return (
      <SafeAreaView>
        <AppScrollView contentContainerClassName="flex-grow justify-center p-6">
          <Text className="text-destructive text-center text-sm">
            {t("auth.passkey.failed")}
          </Text>
        </AppScrollView>
      </SafeAreaView>
    );
  }

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
  const row = usePasskeyRow({
    rename: (next) =>
      authClient.passkey.updatePasskey({ id: passkey.id, name: next }),
    remove: () => authClient.passkey.deletePasskey({ id: passkey.id }),
  });

  const confirmRemove = () =>
    Alert.alert(
      t("settings.passkeys.removeTitle"),
      t("settings.passkeys.removeBody", { name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.remove"),
          style: "destructive",
          onPress: row.remove,
        },
      ],
    );

  const showActions = () =>
    Alert.alert(name, undefined, [
      {
        text: t("settings.passkeys.rename"),
        onPress: () => row.setDraft(passkey.name ?? ""),
      },
      {
        text: t("common.remove"),
        style: "destructive",
        onPress: confirmRemove,
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);

  return (
    <View
      className={cn("gap-2 py-3", divider && "border-border border-b")}
      testID="passkey-row"
    >
      {row.draft === null ? (
        <View className="flex-row items-center gap-3">
          <Icon name="passkey" size={20} color="muted-foreground" />
          <View className="flex-1">
            <Text className="text-foreground text-base font-medium">
              {name}
            </Text>
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
            disabled={row.busy}
            hitSlop={12}
            onPress={showActions}
          >
            <Icon
              name={row.busy ? "loader" : "ellipsis"}
              size={20}
              color="muted-foreground"
            />
          </Pressable>
        </View>
      ) : (
        <View className="gap-2">
          <Input
            testID="passkey-name-input"
            autoFocus
            value={row.draft}
            maxLength={PASSKEY_NAME_MAX_LENGTH}
            placeholder={t("settings.passkeys.namePlaceholder")}
            accessibilityLabel={t("settings.passkeys.namePlaceholder")}
            onChangeText={row.setDraft}
            returnKeyType="done"
            onSubmitEditing={row.saveName}
          />
          <View className="flex-row justify-end gap-2">
            <Button
              variant="ghost"
              title={t("common.cancel")}
              onPress={() => row.setDraft(null)}
            />
            <Button
              testID="passkey-name-save"
              title={t("common.save")}
              disabled={row.busy || !row.draft.trim()}
              onPress={row.saveName}
            />
          </View>
        </View>
      )}
      {row.failed && (
        <Text className="text-destructive text-sm">
          {t("auth.passkey.failed")}
        </Text>
      )}
    </View>
  );
}
