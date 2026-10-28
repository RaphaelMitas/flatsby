import { Share } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-react-native";
import { useTranslations } from "use-intl";

import { inviteLink } from "@flatsby/validators/invite";

import { trpc } from "~/utils/api";
import { getBaseUrl } from "~/utils/base-url";
import { useShoppingStore } from "~/utils/shopping-store";

export function useShareInvite() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const { selectedGroupId, selectedGroupName } = useShoppingStore();
  const groupId = Number(selectedGroupId) || 0;

  return async () => {
    const invite = await queryClient.ensureQueryData(
      trpc.invite.get.queryOptions({ groupId }),
    );
    if (!invite.success) return;
    const result = await Share.share({
      message: t("invite.shareMessage", {
        group: selectedGroupName ?? "",
        link: inviteLink(getBaseUrl(), invite.data.code),
      }),
    });
    // Android always reports sharedAction; iOS reports dismissing the sheet
    if (result.action === Share.sharedAction) {
      posthog.capture("invite_shared", { groupId, method: "share_sheet" });
    }
  };
}
