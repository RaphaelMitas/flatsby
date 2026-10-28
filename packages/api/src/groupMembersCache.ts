import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { placeholderUser } from "@flatsby/validators/group";

import type { OptimisticOptions } from "./resultMutation";
import type { GroupMemberWithUserInfo, GroupWithAccess } from "./types";
import { optimisticMutation } from "./resultMutation";

type MembersPatch = (
  members: GroupMemberWithUserInfo[],
) => GroupMemberWithUserInfo[];

let lastPendingId = 0;

export const groupMembersPatches = {
  added:
    ({ name }: { name: string }): MembersPatch =>
    (members) => [
      ...members,
      {
        id: --lastPendingId,
        userId: null,
        role: "member",
        joinedOn: new Date(),
        isActive: true,
        user: placeholderUser(name),
        placeholderName: name,
      },
    ],
  renamed:
    ({ memberId, name }: { memberId: number; name: string }): MembersPatch =>
    (members) =>
      members.map((member) =>
        member.id === memberId
          ? { ...member, user: placeholderUser(name), placeholderName: name }
          : member,
      ),
  claimUndone:
    ({ memberId }: { memberId: number }): MembersPatch =>
    (members) =>
      members.map((member) =>
        member.id === memberId && member.placeholderName !== null
          ? {
              ...member,
              userId: null,
              user: placeholderUser(member.placeholderName),
            }
          : member,
      ),
};

export const groupMembersMutation = <TData, TInput>(
  queryClient: QueryClient,
  groupKey: QueryKey,
  patchFor: (input: TInput) => MembersPatch,
  options?: OptimisticOptions<TData, TInput>,
) =>
  optimisticMutation<TData, TInput, GroupWithAccess>(
    queryClient,
    groupKey,
    (input) => (group) => ({
      ...group,
      groupMembers: patchFor(input)(group.groupMembers),
    }),
    options,
  );
