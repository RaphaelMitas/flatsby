import { Pressable, Share, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import QRCode from "react-qr-code";
import { useTranslations } from "use-intl";

import {
  formatInviteCode,
  inviteDaysLeft,
  inviteLink,
} from "@flatsby/validators/invite";

import { Button } from "~/lib/ui/button";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { getBaseUrl } from "~/utils/base-url";
import { useShoppingStore } from "~/utils/shopping-store";

export default function InviteScreen() {
  const t = useTranslations();
  const { selectedGroupId, selectedGroupName } = useShoppingStore();
  const groupId = Number(selectedGroupId) || 0;
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: invite } = useSuspenseQuery(
    trpc.invite.get.queryOptions({ groupId }),
  );

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
    return handleApiError({ router, error: invite.error });
  }

  const link = inviteLink(getBaseUrl(), invite.data.code);

  return (
    <View className="bg-background flex-1 items-center gap-4 p-6">
      <Text className="text-foreground text-center text-lg font-bold">
        {t("invite.title", { group: selectedGroupName ?? "" })}
      </Text>
      <Text className="text-muted-foreground text-center text-sm">
        {t("invite.scanWithCamera")}
      </Text>
      <View className="rounded-lg bg-white p-3">
        <QRCode value={link} size={180} />
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
          onPress={() =>
            Share.share({
              message: t("invite.shareMessage", {
                group: selectedGroupName ?? "",
                link,
              }),
            })
          }
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
        {(resetMutation.isError || resetMutation.data?.success === false) && (
          <Text className="text-destructive text-center text-sm">
            {t("invite.resetFailed")}
          </Text>
        )}
      </View>
    </View>
  );
}
