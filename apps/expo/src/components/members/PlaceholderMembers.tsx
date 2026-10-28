import { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import {
  groupMembersMutation,
  groupMembersPatches,
} from "@flatsby/api/groupMembersCache";
import { isPendingId } from "@flatsby/api/resultMutation";
import { isPlaceholder } from "@flatsby/validators/group";

import { trpc } from "~/utils/api";
import { MemberRow } from "./MemberRow";
import { PlaceholderNameField } from "./PlaceholderNameField";

export function PlaceholderMembers({
  groupId,
  title,
  hint,
  onPressMember,
}: {
  groupId: number;
  title: string;
  hint?: string;
  onPressMember?: (memberId: number) => void;
}) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<string>();

  const groupKey = trpc.group.getGroup.queryKey({ id: groupId });
  const { data: group } = useQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );
  const placeholders = group?.success
    ? group.data.groupMembers.filter(isPlaceholder)
    : [];

  const addMutation = useMutation(
    trpc.group.addPlaceholder.mutationOptions(
      groupMembersMutation(queryClient, groupKey, groupMembersPatches.added, {
        onFailure: (message) => setFailure(message ?? t("errors.unexpected")),
        invalidate: [trpc.group.getUserGroups.queryFilter()],
      }),
    ),
  );

  return (
    <View className="gap-2">
      <Text className="text-foreground text-base font-medium">{title}</Text>
      {hint && <Text className="text-muted-foreground text-sm">{hint}</Text>}
      <View>
        {placeholders.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            testID={`placeholder-row-${member.user.name}`}
            onPress={
              onPressMember && !isPendingId(member.id)
                ? () => onPressMember(member.id)
                : undefined
            }
          />
        ))}
      </View>
      <PlaceholderNameField
        placeholder={t("group.placeholders.namePlaceholder")}
        submitLabel={t("group.placeholders.add")}
        submitIcon="plus"
        inputTestID="placeholder-name-input"
        buttonTestID="placeholder-add-button"
        onSubmit={(name) => {
          setFailure(undefined);
          addMutation.mutate({ groupId, name });
        }}
      />
      {failure !== undefined && (
        <Text className="text-destructive text-sm">{failure}</Text>
      )}
    </View>
  );
}
