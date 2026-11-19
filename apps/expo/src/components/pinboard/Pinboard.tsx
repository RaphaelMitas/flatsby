import type { Pin, PinIcon } from "@flatsby/validators/pinboard";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import { useTranslations } from "use-intl";

import { isPendingId } from "@flatsby/api/resultMutation";
import {
  MAX_PINS_PER_GROUP,
  pinStarters,
  wifiQrText,
} from "@flatsby/validators/pinboard";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import { CenteredModal } from "~/lib/ui/centered-modal";
import Icon from "~/lib/ui/custom/icons/Icon";
import { ErrorMessage } from "~/lib/ui/error-message";
import { Fab } from "~/lib/ui/fab";
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";

function PinIconBadge({ icon }: { icon: PinIcon }) {
  return (
    <View className="bg-muted h-10 w-10 items-center justify-center rounded-full">
      <Icon name={icon} size={18} color="foreground" />
    </View>
  );
}

export function Pinboard({ groupId }: { groupId: number }) {
  const t = useTranslations();
  const router = useRouter();
  const { data, refetch } = useQuery(
    trpc.pinboard.list.queryOptions({ groupId }),
  );
  const [codeFor, setCodeFor] = useState<Pin>();

  const openForm = (params: { id?: number; title?: string; icon?: PinIcon }) =>
    router.push({ pathname: "/(tabs)/home/pinboard/form", params });

  if (!data) return null;
  if (!data.success) return <ErrorMessage message={data.error.message} />;
  const pins = data.data;

  return (
    <View className="flex-1">
      <AppScrollView
        contentContainerClassName="gap-3 px-5 pt-4 pb-28"
        onRefresh={refetch}
      >
        {pins.length === 0 ? (
          <EmptyBoard
            onStart={(starter) =>
              openForm({ title: t(starter.title), icon: starter.icon })
            }
          />
        ) : (
          pins.map((pin) => (
            <PinCard
              key={pin.id}
              pin={pin}
              onEdit={() => openForm({ id: pin.id })}
              onShowCode={() => setCodeFor(pin)}
            />
          ))
        )}
      </AppScrollView>
      {pins.length < MAX_PINS_PER_GROUP && (
        <Fab
          testID="pinboard-add"
          accessibilityLabel={t("pinboard.add")}
          onPress={() => openForm({})}
        />
      )}
      <CenteredModal visible={!!codeFor} onClose={() => setCodeFor(undefined)}>
        {codeFor?.wifi && (
          <View testID="pin-qr-dialog" className="items-center gap-1">
            <Text className="text-foreground text-xl font-extrabold">
              {codeFor.title}
            </Text>
            <Text className="text-muted-foreground text-base">
              {codeFor.wifi.ssid}
            </Text>
            <View className="my-4 rounded-lg bg-white p-3">
              <QRCode value={wifiQrText(codeFor.wifi)} size={200} />
            </View>
            <Text className="text-muted-foreground text-center text-sm">
              {t("pinboard.qr.hint")}
            </Text>
            <Button
              testID="pin-qr-done"
              variant="secondary"
              className="mt-4 self-stretch"
              title={t("common.done")}
              onPress={() => setCodeFor(undefined)}
            />
          </View>
        )}
      </CenteredModal>
    </View>
  );
}

function PinCard({
  pin,
  onEdit,
  onShowCode,
}: {
  pin: Pin;
  onEdit: () => void;
  onShowCode: () => void;
}) {
  const t = useTranslations();

  return (
    <View
      testID={`pin-${pin.title}`}
      className={cn(
        "bg-card border-border flex-row gap-3 rounded-2xl border py-3 pr-1 pl-4",
        isPendingId(pin.id) && "opacity-60",
      )}
    >
      <PinIconBadge icon={pin.icon} />
      <View className="min-w-0 flex-1 py-0.5">
        <Text className="text-foreground text-base font-semibold">
          {pin.title}
        </Text>
        {pin.wifi && (
          <>
            <Text selectable className="text-muted-foreground text-base">
              {pin.wifi.ssid}
            </Text>
            {pin.wifi.password !== "" && (
              <Text selectable className="text-muted-foreground text-base">
                {pin.wifi.password}
              </Text>
            )}
          </>
        )}
        {pin.body !== "" && (
          <Text selectable className="text-muted-foreground text-base">
            {pin.body}
          </Text>
        )}
        {pin.wifi && (
          <Button
            testID={`pin-qr-${pin.title}`}
            variant="outline"
            size="sm"
            icon="qr-code"
            title={t("pinboard.qr.open")}
            className="mt-2 self-start"
            onPress={onShowCode}
          />
        )}
      </View>
      <Button
        testID={`pin-edit-${pin.title}`}
        variant="ghost"
        size="icon"
        icon="pencil"
        iconColor="muted-foreground"
        className="self-start"
        accessibilityLabel={t("pinboard.editEntry", { title: pin.title })}
        disabled={isPendingId(pin.id)}
        onPress={onEdit}
      />
    </View>
  );
}

function EmptyBoard({
  onStart,
}: {
  onStart: (starter: (typeof pinStarters)[number]) => void;
}) {
  const t = useTranslations();

  return (
    <View testID="pinboard-empty" className="pt-6">
      <Text className="text-foreground text-2xl font-extrabold tracking-tight">
        {t("pinboard.empty.title")}
      </Text>
      <Text className="text-muted-foreground mt-1 text-base">
        {t("pinboard.empty.body")}
      </Text>
      <Text className="text-muted-foreground mt-8 mb-2 text-sm font-semibold">
        {t("pinboard.empty.startWith")}
      </Text>
      <View className="bg-card border-border rounded-2xl border">
        {pinStarters.map((starter, index) => (
          <Pressable
            key={starter.icon}
            testID={`pinboard-starter-${starter.icon}`}
            accessibilityRole="button"
            onPress={() => onStart(starter)}
            className={cn(
              "flex-row items-center gap-3 px-4 py-3 active:opacity-70",
              index > 0 && "border-border border-t",
            )}
          >
            <PinIconBadge icon={starter.icon} />
            <Text className="text-foreground flex-1 text-base font-semibold">
              {t(starter.title)}
            </Text>
            <Icon name="plus" size={18} color="muted-foreground" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
