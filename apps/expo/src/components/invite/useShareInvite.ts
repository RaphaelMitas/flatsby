import { Share } from "react-native";
import { useTranslations } from "use-intl";

import { inviteLink, inviteMessage } from "@flatsby/validators/invite";

import { getPostHog } from "~/utils/analytics/posthog";
import { getBaseUrl } from "~/utils/base-url";
import { useShoppingStore } from "~/utils/shopping-store";

export interface InvitePlaceholder {
  id: number;
  name: string;
}

export function useInviteMessage() {
  const t = useTranslations();
  return (code: string, placeholder?: InvitePlaceholder) =>
    inviteMessage(
      t,
      inviteLink(getBaseUrl(), code, placeholder?.id),
      placeholder?.name,
    );
}

export function useShareInvite() {
  const message = useInviteMessage();
  const { selectedGroupId } = useShoppingStore();
  const groupId = Number(selectedGroupId) || 0;

  return async (code: string, placeholder?: InvitePlaceholder) => {
    const result = await Share.share({ message: message(code, placeholder) });
    // Android always reports sharedAction; iOS reports dismissing the sheet
    if (result.action === Share.sharedAction) {
      getPostHog().capture("invite_shared", { groupId, method: "share_sheet" });
    }
  };
}
