import { Share } from "react-native";
import { usePostHog } from "posthog-react-native";
import { useTranslations } from "use-intl";

import { inviteLink } from "@flatsby/validators/invite";

import { getBaseUrl } from "~/utils/base-url";
import { useShoppingStore } from "~/utils/shopping-store";

export function useShareInvite() {
  const t = useTranslations();
  const posthog = usePostHog();
  const { selectedGroupId, selectedGroupName } = useShoppingStore();
  const groupId = Number(selectedGroupId) || 0;

  return async (code: string) => {
    const result = await Share.share({
      message: t("invite.shareMessage", {
        group: selectedGroupName ?? "",
        link: inviteLink(getBaseUrl(), code),
      }),
    });
    // Android always reports sharedAction; iOS reports dismissing the sheet
    if (result.action === Share.sharedAction) {
      posthog.capture("invite_shared", { groupId, method: "share_sheet" });
    }
  };
}
