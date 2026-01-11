import type { GroupMemberInfo } from "@flatsby/validators/chat/tools";
import { useCallback } from "react";
import { Text } from "react-native";

import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import { Button } from "~/lib/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";

interface MemberSelectorProps {
  members: GroupMemberInfo[];
  context?: "payer" | "split";
  onSelect: (member: GroupMemberInfo) => void;
  disabled?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MemberSelector({
  members,
  context,
  onSelect,
  disabled,
}: MemberSelectorProps) {
  const handleSelect = useCallback(
    (member: GroupMemberInfo) => {
      if (!disabled) {
        onSelect(member);
      }
    },
    [disabled, onSelect],
  );

  const title =
    context === "payer"
      ? "Who paid?"
      : context === "split"
        ? "Split with"
        : "Select member";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex-row items-center gap-2">
          <Icon name="users" size={16} color="foreground" />
          <Text className="text-foreground text-sm font-medium">{title}</Text>
        </CardTitle>
      </CardHeader>
      <CardContent className="gap-2 pt-0">
        {members.map((member) => (
          <Button
            key={member.id}
            variant="outline"
            onPress={() => handleSelect(member)}
            disabled={disabled}
            className="justify-start px-3 py-3"
          >
            <Avatar className="h-8 w-8">
              {member.image && <AvatarImage src={member.image} />}
              <AvatarFallback>
                <Text className="text-xs">{getInitials(member.name)}</Text>
              </AvatarFallback>
            </Avatar>
            <Text className="text-foreground text-sm">
              {member.name}
              {member.isCurrentUser && " (You)"}
            </Text>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
