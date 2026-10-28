import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { TipCard } from "~/components/TipCard";
import { Button } from "~/lib/ui/button";
import { trpc } from "~/utils/api";

const dismissedKey = (groupId: number) => `invite_card_dismissed_${groupId}`;

export function InviteFlatmatesCard({
  groupId,
  className,
}: {
  groupId: number;
  className?: string;
}) {
  const t = useTranslations("invite");
  const router = useRouter();
  const [dismissal, setDismissal] = useState<{
    groupId: number;
    dismissed: boolean;
  }>();
  const { data: group } = useQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );
  const memberCount = group?.success
    ? group.data.groupMembers.length
    : undefined;

  useEffect(() => {
    AsyncStorage.getItem(dismissedKey(groupId))
      .then((value) => setDismissal({ groupId, dismissed: value !== null }))
      .catch(() => setDismissal({ groupId, dismissed: false }));
  }, [groupId]);

  if (
    memberCount !== 1 ||
    dismissal?.groupId !== groupId ||
    dismissal.dismissed
  )
    return null;

  const dismiss = () => {
    setDismissal({ groupId, dismissed: true });
    void AsyncStorage.setItem(dismissedKey(groupId), "true");
  };

  return (
    <TipCard
      testID="invite-flatmates-card"
      dismissTestID="invite-flatmates-dismiss"
      className={className}
      title={t("solo.title")}
      body={t("solo.body")}
      dismissLabel={t("solo.dismiss")}
      onDismiss={dismiss}
    >
      <Button
        testID="invite-flatmates-open"
        title={t("open")}
        icon="user-plus"
        onPress={() => router.push("/(tabs)/home/invite")}
      />
    </TipCard>
  );
}
