import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { usePostHog } from "posthog-react-native";
import QRCode from "react-qr-code";
import { useTranslations } from "use-intl";

import { failureOf } from "@flatsby/api/resultMutation";
import {
  formatInviteCode,
  inviteDaysLeft,
  inviteLink,
} from "@flatsby/validators/invite";

import { PlaceholderMembers } from "~/components/members/PlaceholderMembers";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import { trpc } from "~/utils/api";
import { getBaseUrl } from "~/utils/base-url";
import { useShoppingStore } from "~/utils/shopping-store";
import { useShareInvite } from "./useShareInvite";

export function InviteScreen({
  onDone,
  withPlaceholders,
}: {
  onDone?: () => void;
  withPlaceholders?: boolean;
}) {
  const t = useTranslations();
  const { selectedGroupId, selectedGroupName } = useShoppingStore();
  const groupId = Number(selectedGroupId) || 0;
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const shareInvite = useShareInvite();

  const { data: invite } = useSuspenseQuery(
    trpc.invite.get.queryOptions({ groupId }),
  );

  const hasCapturedShown = useRef(false);

  // QR scans and read-out codes leave no trace, so showing them is what's countable
  useEffect(() => {
    if (!invite.success || hasCapturedShown.current) return;
    hasCapturedShown.current = true;
    posthog.capture("invite_shown", { groupId });
  }, [invite.success, posthog, groupId]);

  const resetMutation = useMutation(
    trpc.invite.reset.mutationOptions({
      onMutate: () =>
        queryClient.cancelQueries(trpc.invite.get.queryFilter({ groupId })),
      onSuccess: (data) => {
        if (!data.success) return;
        queryClient.setQueryData(trpc.invite.get.queryKey({ groupId }), data);
      },
    }),
  );

  if (!invite.success) {
    return null;
  }

  const link = inviteLink(getBaseUrl(), invite.data.code);
  const resetFailure = failureOf(resetMutation, t("invite.resetFailed"));

  return (
    <AppScrollView
      className="bg-background"
      contentContainerClassName="items-center gap-4 p-6"
    >
      <Text className="text-foreground text-center text-lg font-bold">
        {t("invite.title", { group: selectedGroupName ?? "" })}
      </Text>
      <Text className="text-muted-foreground text-center text-sm">
        {t("invite.anyoneCanJoin")}
      </Text>
      <Text className="text-muted-foreground text-center text-sm">
        {t("invite.scanWithCamera")}
      </Text>
      <View className="rounded-lg bg-white p-3">
        <QRCode value={link} size={withPlaceholders ? 120 : 180} />
      </View>
      <Text className="text-muted-foreground text-xs">
        {t("invite.orEnterCode")}
      </Text>
      <Text
        testID="group-invite-code"
        className="text-foreground font-mono text-2xl font-bold tracking-widest"
      >
        {formatInviteCode(invite.data.code)}
      </Text>
      <View className="w-full gap-3">
        <Button
          testID="group-invite-share"
          title={t("invite.shareLink")}
          icon="share"
          onPress={() => shareInvite(invite.data.code)}
        />
        <View className="flex-row items-center justify-between">
          <Text className="text-muted-foreground text-xs">
            {t("invite.expiresIn", {
              days: inviteDaysLeft(invite.data.expiresAt),
            })}
          </Text>
          <Pressable
            disabled={resetMutation.isPending}
            onPress={() => resetMutation.mutate({ groupId })}
          >
            <Text className="text-destructive text-xs font-semibold">
              {t("invite.resetLink")}
            </Text>
          </Pressable>
        </View>
        {resetFailure !== undefined && (
          <Text className="text-destructive text-center text-sm">
            {resetFailure}
          </Text>
        )}
      </View>
      {withPlaceholders && (
        <View className="w-full">
          <PlaceholderMembers
            groupId={groupId}
            title={t("group.placeholders.inviteStepTitle")}
            hint={t("group.placeholders.inviteStepHint")}
          />
        </View>
      )}
      {onDone && (
        <Button
          testID="group-invite-done"
          title={t("invite.done")}
          variant="outline"
          className="w-full"
          onPress={onDone}
        />
      )}
    </AppScrollView>
  );
}
