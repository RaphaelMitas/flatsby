"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import { hasJoined } from "@flatsby/validators/group";

import { useTRPC } from "~/trpc/react";
import { InviteDialog } from "./InviteDialog";
import { MemberCard } from "./MemberCard";
import { PlaceholderMembers } from "./PlaceholderMembers";

interface ManageMembersProps {
  groupId: number;
}

const ManageMembers = ({ groupId }: ManageMembersProps) => {
  const t = useTranslations();
  const trpc = useTRPC();

  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  if (!group.success) {
    return null;
  }

  const isAdmin = group.data.thisGroupMember.role === "admin";

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="group-manage-members-title">
          {t("group.members.title")}
        </CardTitle>
        <CardDescription>{t("group.members.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {isAdmin && (
            <InviteDialog groupId={groupId} groupName={group.data.name} />
          )}
          <div className="grid gap-4">
            {group.data.groupMembers.filter(hasJoined).map((groupMember) => (
              <MemberCard
                key={groupMember.id}
                groupId={groupId}
                groupName={group.data.name}
                groupMember={groupMember}
                currentUserGroupMember={group.data.thisGroupMember}
              />
            ))}
          </div>
          <PlaceholderMembers
            groupId={groupId}
            title={t("group.placeholders.sectionTitle")}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ManageMembers;
