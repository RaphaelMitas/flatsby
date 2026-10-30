"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import {
  groupMembersMutation,
  groupMembersPatches,
} from "@flatsby/api/groupMembersCache";
import { toast } from "@flatsby/ui/toast";
import { isPlaceholder } from "@flatsby/validators/group";

import { useTRPC } from "~/trpc/react";
import { MemberCard } from "./MemberCard";
import { PlaceholderNameForm } from "./PlaceholderNameForm";

export function PlaceholderMembers({
  groupId,
  title,
  hint,
  withActions,
}: {
  groupId: number;
  title: string;
  hint?: string;
  withActions?: boolean;
}) {
  const t = useTranslations();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const groupKey = trpc.group.getGroup.queryKey({ id: groupId });
  const { data: group } = useQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const addMutation = useMutation(
    trpc.group.addPlaceholder.mutationOptions(
      groupMembersMutation(queryClient, groupKey, groupMembersPatches.added, {
        onFailure: (message) =>
          toast.error(t("common.error"), {
            description: message ?? t("errors.unexpected"),
          }),
      }),
    ),
  );

  if (!group?.success) return null;
  const placeholders = group.data.groupMembers.filter(isPlaceholder);
  const isAdmin = group.data.thisGroupMember.role === "admin";
  if (!isAdmin && placeholders.length === 0) return null;

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <p className="text-muted-foreground text-sm font-semibold">{title}</p>
        {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
      </div>
      {placeholders.map((member) => (
        <MemberCard
          key={member.id}
          groupId={groupId}
          groupName={group.data.name}
          groupMember={member}
          currentUserGroupMember={group.data.thisGroupMember}
          withActions={withActions}
        />
      ))}
      {isAdmin && (
        <PlaceholderNameForm
          submitLabel={t("group.placeholders.add")}
          inputTestId="placeholder-name-input"
          buttonTestId="placeholder-add-button"
          onSubmit={(name) => addMutation.mutate({ groupId, name })}
        />
      )}
    </div>
  );
}
