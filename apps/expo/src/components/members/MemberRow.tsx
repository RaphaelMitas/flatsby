import type { GroupMemberWithUserInfo } from "@flatsby/api";
import { Pressable, Text, View } from "react-native";
import { useTranslations } from "use-intl";

import Icon from "~/lib/ui/custom/icons/Icon";
import { cn } from "~/lib/utils";
import { MemberAvatar, memberPerson } from "../expenses/MemberAvatar";

export function MemberRow({
  member,
  onPress,
  testID,
  className,
}: {
  member: GroupMemberWithUserInfo;
  onPress?: () => void;
  testID?: string;
  className?: string;
}) {
  const t = useTranslations("group.members");

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      className={cn(
        "bg-background flex-row items-center gap-3 py-3",
        onPress && "active:bg-muted",
        className,
      )}
    >
      <MemberAvatar person={memberPerson(member)} />
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text
            className="text-foreground shrink font-medium"
            numberOfLines={1}
          >
            {member.user.name}
          </Text>
          {member.role === "admin" && (
            <Text className="text-muted-foreground ml-1 text-sm font-medium">
              {t("adminBadge")}
            </Text>
          )}
        </View>
        {member.user.email !== null && (
          <Text className="text-muted-foreground text-sm" numberOfLines={1}>
            {member.user.email}
          </Text>
        )}
      </View>
      {onPress && <Icon name="ellipsis-vertical" size={16} />}
    </Pressable>
  );
}
