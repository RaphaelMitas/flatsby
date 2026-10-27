import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { Button } from "~/lib/ui/button";
import { Card, CardContent } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
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
    <Card testID="invite-flatmates-card" className={className}>
      <CardContent className="gap-3 p-4">
        <View className="flex-row items-start gap-2">
          <View className="flex-1 gap-1">
            <Text className="text-foreground text-base font-bold">
              {t("solo.title")}
            </Text>
            <Text className="text-muted-foreground text-sm">
              {t("solo.body")}
            </Text>
          </View>
          <Pressable
            testID="invite-flatmates-dismiss"
            accessibilityLabel={t("solo.dismiss")}
            hitSlop={8}
            onPress={dismiss}
          >
            <Icon name="x" size={18} color="muted-foreground" />
          </Pressable>
        </View>
        <Button
          testID="invite-flatmates-open"
          title={t("open")}
          icon="user-plus"
          onPress={() => router.push("/(tabs)/home/invite")}
        />
      </CardContent>
    </Card>
  );
}
