import type { PinFormValues, PinIcon } from "@flatsby/validators/pinboard";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";

import {
  MAX_PIN_BODY_LENGTH,
  MAX_PIN_TITLE_LENGTH,
  MAX_WIFI_PASSWORD_LENGTH,
  MAX_WIFI_SSID_LENGTH,
  pinContentOf,
  pinFormOf,
  pinFormSchema,
  pinIcons,
  wifiFromQrText,
} from "@flatsby/validators/pinboard";

import type { PictureSource } from "~/utils/pick-picture";
import DeleteConfirmationModal from "~/components/DeleteConfirmationModal";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Form, FormField, FormMessage, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { pickPicture } from "~/utils/pick-picture";
import { qrTextFromPicture } from "~/utils/qr-from-picture";
import { usePinMutations } from "./usePinMutations";

interface PinFormProps {
  groupId: number;
  pinId?: number;
  draft: Partial<PinFormValues>;
}

export function PinForm({ groupId, pinId, draft }: PinFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { data } = useQuery(trpc.pinboard.list.queryOptions({ groupId }));
  const pin = data?.success
    ? data.data.find(({ id }) => id === pinId)
    : undefined;
  const { create, update, remove } = usePinMutations(groupId);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProblem, setScanProblem] = useState<string>();

  const saved = pinFormOf(pin);
  const form = useForm({
    schema: pinFormSchema,
    defaultValues: {
      title: draft.title ?? saved.title,
      body: draft.body ?? saved.body,
      icon: draft.icon ?? saved.icon,
      ssid: draft.ssid ?? saved.ssid,
      password: draft.password ?? saved.password,
    },
  });
  const isWifi = useWatch({ control: form.control, name: "icon" }) === "wifi";

  const save = (values: PinFormValues) => {
    const content = pinContentOf(values);
    if (pin) update.mutate({ groupId, id: pin.id, ...content });
    else create.mutate({ groupId, ...content });
    router.back();
  };

  const pickIcon = (icon: PinIcon) => {
    form.setValue("icon", icon);
    if (icon === "wifi" && form.getValues("title") === "")
      form.setValue("title", t("pinboard.starters.wifi"));
  };

  const scan = async (source: PictureSource) => {
    setScanProblem(undefined);
    const picture = await pickPicture(source);
    if (picture === "denied") {
      setScanProblem(t("pinboard.form.cameraDenied"));
      return;
    }
    if (!picture) return;
    setScanning(true);
    const text = await qrTextFromPicture(picture.uri).catch(() => undefined);
    setScanning(false);
    const wifi = wifiFromQrText(text ?? "");
    if (!wifi) {
      setScanProblem(t("pinboard.form.noCode"));
      return;
    }
    form.setValue("ssid", wifi.ssid);
    form.setValue("password", wifi.password);
    form.clearErrors("body");
  };

  const startsWithTitle = pinId === undefined && draft.title !== undefined;

  return (
    <AppScrollView contentContainerClassName="p-4">
      <Stack.Screen
        options={{
          title:
            pinId === undefined
              ? t("pinboard.newTitle")
              : t("pinboard.editTitle"),
        }}
      />
      <Form {...form}>
        <Label className="mb-2">{t("pinboard.form.title")}</Label>
        <FormField
          name="title"
          control={form.control}
          render={({ field, fieldState }) => (
            <>
              <Input
                testID="pin-form-title"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={t("pinboard.starters.bins")}
                error={!!fieldState.error}
                maxLength={MAX_PIN_TITLE_LENGTH}
                autoFocus={pinId === undefined && !startsWithTitle}
              />
              <FormMessage />
            </>
          )}
        />

        <Label className="mt-6 mb-2">{t("pinboard.form.icon")}</Label>
        <FormField
          name="icon"
          control={form.control}
          render={({ field }) => (
            <View className="flex-row flex-wrap gap-1.5">
              {pinIcons.map((icon) => (
                <Pressable
                  key={icon}
                  testID={`pin-form-icon-${icon}`}
                  accessibilityRole="button"
                  accessibilityLabel={t(`pinboard.icon.${icon}`)}
                  accessibilityState={{ selected: field.value === icon }}
                  onPress={() => pickIcon(icon)}
                  className={cn(
                    "h-10 w-10 items-center justify-center rounded-full",
                    field.value === icon ? "bg-primary" : "bg-muted",
                  )}
                >
                  <Icon
                    name={icon}
                    size={18}
                    color={
                      field.value === icon ? "primary-foreground" : "foreground"
                    }
                  />
                </Pressable>
              ))}
            </View>
          )}
        />

        {isWifi && (
          <>
            <Label className="mt-6 mb-2">{t("pinboard.form.ssid")}</Label>
            <FormField
              name="ssid"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    testID="pin-form-ssid"
                    value={field.value}
                    onChangeText={(ssid) => {
                      field.onChange(ssid);
                      form.clearErrors("body");
                    }}
                    onBlur={field.onBlur}
                    placeholder={t("pinboard.form.ssidPlaceholder")}
                    error={!!fieldState.error}
                    maxLength={MAX_WIFI_SSID_LENGTH}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus={startsWithTitle}
                  />
                  <FormMessage />
                </>
              )}
            />
            <Text className="text-muted-foreground mt-2 text-sm">
              {t("pinboard.form.ssidHint")}
            </Text>

            <Label className="mt-6 mb-2">{t("pinboard.form.password")}</Label>
            <FormField
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    testID="pin-form-password"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    maxLength={MAX_WIFI_PASSWORD_LENGTH}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <FormMessage />
                </>
              )}
            />

            <Text className="text-muted-foreground mt-4 text-sm">
              {t("pinboard.form.wifiHelp")}
            </Text>
            <View className="mt-3 flex-row gap-2">
              <Button
                testID="pin-form-scan-camera"
                variant="outline"
                className="flex-1"
                icon={scanning ? "loader" : "camera"}
                title={t("pinboard.form.takePhoto")}
                disabled={scanning}
                onPress={() => scan("camera")}
              />
              <Button
                testID="pin-form-scan-library"
                variant="outline"
                className="flex-1"
                icon={scanning ? "loader" : "image"}
                title={t("pinboard.form.choosePicture")}
                disabled={scanning}
                onPress={() => scan("library")}
              />
            </View>
            {scanProblem && (
              <Text
                testID="pin-form-scan-problem"
                className="text-destructive mt-2 text-sm"
              >
                {scanProblem}
              </Text>
            )}
          </>
        )}

        <View className="mt-6 mb-2 flex-row items-baseline gap-1.5">
          <Label>
            {isWifi ? t("pinboard.form.note") : t("pinboard.form.body")}
          </Label>
          {isWifi && (
            <Text className="text-muted-foreground text-sm">
              {t("pinboard.form.optional")}
            </Text>
          )}
        </View>
        <FormField
          name="body"
          control={form.control}
          render={({ field, fieldState }) => (
            <>
              <Input
                testID="pin-form-body"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={
                  isWifi
                    ? t("pinboard.form.notePlaceholder")
                    : t("pinboard.form.bodyPlaceholder")
                }
                error={!!fieldState.error}
                maxLength={MAX_PIN_BODY_LENGTH}
                multiline
                textAlignVertical="top"
                className={cn("py-3", isWifi ? "h-20" : "h-32")}
                autoFocus={startsWithTitle && !isWifi}
              />
              <FormMessage />
            </>
          )}
        />
      </Form>

      <Button
        testID="pin-form-save"
        className="mt-8"
        size="lg"
        title={
          pinId === undefined ? t("pinboard.form.create") : t("common.save")
        }
        onPress={form.handleSubmit(save)}
      />

      {pin && (
        <>
          <Button
            testID="pin-form-delete"
            title={t("pinboard.delete.title")}
            variant="ghost"
            icon="trash-2"
            iconColor="destructive"
            textClassName="text-destructive"
            className="mt-4"
            onPress={() => setConfirmingDelete(true)}
          />
          <DeleteConfirmationModal
            visible={confirmingDelete}
            onClose={() => setConfirmingDelete(false)}
            onConfirm={() => {
              setConfirmingDelete(false);
              remove.mutate({ groupId, id: pin.id });
              router.back();
            }}
            itemName={pin.title}
            title={t("pinboard.delete.title")}
            description={t("pinboard.delete.description", {
              title: pin.title,
            })}
          />
        </>
      )}
    </AppScrollView>
  );
}
