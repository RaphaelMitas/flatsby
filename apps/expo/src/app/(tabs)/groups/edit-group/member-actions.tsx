import type {
  RemoveGroupMemberInput,
  UpdateMemberRoleInput,
} from "@flatsby/validators/group";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import { Button } from "~/lib/ui/button";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

// Global state for communication between screens
let memberActionCallback: {
  onUpdateRole?: ({ memberId, newRole }: UpdateMemberRoleInput) => void;
  onRemoveMember?: ({ memberId }: RemoveGroupMemberInput) => void;
} = {};

export const setMemberActionCallbacks = (
  callbacks: typeof memberActionCallback,
) => {
  memberActionCallback = callbacks;
};

export default function MemberActionsScreen() {
  const { selectedGroupId } = useShoppingStore();
  const { memberId } = useLocalSearchParams();
  const router = useRouter();

  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({
      id: Number(selectedGroupId) || 0,
    }),
  );

  if (!group.success) {
    return handleApiError({ router, error: group.error });
  }

  const groupMember = group.data.groupMembers.find(
    (member) => member.id === Number(memberId),
  );
  const currentUserGroupMember = group.data.thisGroupMember;

  if (!groupMember) {
    router.back();
    return null;
  }

  const isCurrentUser = groupMember.id === currentUserGroupMember.id;
  const isCurrentUserAdmin = currentUserGroupMember.role === "admin";
  const isUserAdmin = groupMember.role === "admin";

  const handleUpdateRole = (newRole: "admin" | "member") => {
    if (memberActionCallback.onUpdateRole) {
      memberActionCallback.onUpdateRole({ memberId: groupMember.id, newRole });
    }
    router.back();
  };

  const handleRemoveMember = () => {
    if (memberActionCallback.onRemoveMember) {
      memberActionCallback.onRemoveMember({ memberId: groupMember.id });
    }
    router.back();
  };

  return (
    <View className="bg-background flex-1 p-6">
      <View className="mb-6 flex-row items-center gap-3">
        <Avatar>
          <AvatarImage src={groupMember.user.image ?? undefined} />
          <AvatarFallback>
            {groupMember.user.name
              ? groupMember.user.name.substring(0, 2).toUpperCase()
              : "??"}
          </AvatarFallback>
        </Avatar>
        <View className="flex-1">
          <Text className="text-foreground text-lg font-semibold">
            {groupMember.user.name}
          </Text>
          <Text className="text-muted-foreground text-sm">
            {groupMember.user.email}
          </Text>
        </View>
      </View>

      {isCurrentUserAdmin && (
        <View className="mb-6 gap-3">
          <Text className="text-foreground text-sm font-medium">
            Change Role
          </Text>
          <View className="flex-row gap-2">
            <Button
              title="Admin"
              variant={isUserAdmin ? "primary" : "outline"}
              className="flex-1"
              onPress={() => handleUpdateRole("admin")}
            />
            <Button
              title="Member"
              variant={!isUserAdmin ? "primary" : "outline"}
              className="flex-1"
              onPress={() => handleUpdateRole("member")}
            />
          </View>
        </View>
      )}

      <Text className="text-foreground mb-6 text-sm font-medium">
        Manage Member
      </Text>
      <View className="flex-row gap-3">
        <Button
          title="Cancel"
          variant="outline"
          className="flex-1"
          onPress={() => router.back()}
        />
        <Button
          title={isCurrentUser ? "Leave Group" : "Remove"}
          variant="destructive"
          className="flex-1"
          icon="trash-2"
          onPress={handleRemoveMember}
        />
      </View>
    </View>
  );
}
