import type { QueryClient, QueryKey } from "@tanstack/react-query";

import type { ApiResult } from "./errors";
import type { GroupMemberWithUserInfo, GroupWithAccess } from "./types";
import { restoreSnapshot, resultMutation } from "./resultMutation";

type MembersPatch = (
  members: GroupMemberWithUserInfo[],
) => GroupMemberWithUserInfo[];

let lastPendingId = 0;

const placeholderUser = (name: string) => ({ name, email: null, image: null });

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

/** Optimistic changes to `group.getGroup`'s member list, rolled back if the server refuses. */
export const groupMembersMutation = <TData, TInput>(
  queryClient: QueryClient,
  groupKey: QueryKey,
  patchFor: (input: TInput) => MembersPatch,
  {
    onFailure,
    onSuccess,
  }: {
    onFailure?: (message: string | undefined) => void;
    onSuccess?: (data: TData, input: TInput) => void;
  } = {},
) =>
  resultMutation({
    onMutate: async (input: TInput) => {
      await queryClient.cancelQueries({ queryKey: groupKey });
      const previous = queryClient.getQueryData(groupKey);
      queryClient.setQueryData<ApiResult<GroupWithAccess>>(groupKey, (old) =>
        old?.success
          ? {
              ...old,
              data: {
                ...old.data,
                groupMembers: patchFor(input)(old.data.groupMembers),
              },
            }
          : old,
      );
      return [{ queryKey: groupKey, previous }];
    },
    rollback: restoreSnapshot(queryClient),
    onFailure,
    onSuccess,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: groupKey }),
  });
