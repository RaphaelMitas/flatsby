import { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import {
  groupMembersMutation,
  groupMembersPatches,
} from "@flatsby/api/groupMembersCache";
import {
  isPlaceholder,
  MAX_PLACEHOLDER_NAME_LENGTH,
  placeholderNameSchema,
} from "@flatsby/validators/group";

import { Button } from "~/lib/ui/button";
import { Input } from "~/lib/ui/input";
import { trpc } from "~/utils/api";
import { MemberRow } from "./MemberRow";

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
  const [name, setName] = useState("");
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
        onSuccess: () =>
          void queryClient.invalidateQueries(
            trpc.group.getUserGroups.queryFilter(),
          ),
      }),
    ),
  );

  const add = () => {
    const parsed = placeholderNameSchema.safeParse(name);
    if (!parsed.success) return;
    setFailure(undefined);
    addMutation.mutate({ groupId, name: parsed.data });
    setName("");
  };

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
            // Pending rows get their real id from the refetch
            onPress={
              onPressMember && member.id > 0
                ? () => onPressMember(member.id)
                : undefined
            }
          />
        ))}
      </View>
      <View className="flex-row items-center gap-3">
        <Input
          testID="placeholder-name-input"
          className="flex-1"
          placeholder={t("group.placeholders.namePlaceholder")}
          value={name}
          onChangeText={setName}
          maxLength={MAX_PLACEHOLDER_NAME_LENGTH}
          returnKeyType="done"
          onSubmitEditing={add}
          submitBehavior="submit"
        />
        <Button
          testID="placeholder-add-button"
          title={t("group.placeholders.add")}
          icon="plus"
          disabled={name.trim() === ""}
          onPress={add}
        />
      </View>
      {failure !== undefined && (
        <Text className="text-destructive text-sm">{failure}</Text>
      )}
    </View>
  );
}
