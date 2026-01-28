"use client";

import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";

import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";

export function GroupSwitcher() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: userWithGroups } = useSuspenseQuery(
    trpc.user.getCurrentUserWithGroups.queryOptions(),
  );

  const updateLastUsed = useMutation(
    trpc.shoppingList.updateLastUsed.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries();
        router.refresh();
      },
    }),
  );

  if (!userWithGroups.success) {
    return handleApiError(userWithGroups.error);
  }

  const currentGroupId = userWithGroups.data.user?.lastGroupUsed?.id;

  const handleGroupChange = (groupId: string) => {
    if (groupId === "create-group") {
      router.push("/group/create");
      return;
    }

    const id = parseInt(groupId);
    if (id === currentGroupId) return;

    updateLastUsed.mutate({
      groupId: id,
      shoppingListId: null,
    });
  };

  return (
    <Select
      value={currentGroupId?.toString() ?? ""}
      onValueChange={handleGroupChange}
      disabled={updateLastUsed.isPending}
    >
      <SelectTrigger className="w-100 xl:absolute xl:left-1/2 xl:-translate-x-1/2">
        <SelectValue placeholder="Select group" />
      </SelectTrigger>
      <SelectContent>
        {userWithGroups.data.groups.map((group) => (
          <SelectItem key={group.id} value={group.id.toString()}>
            {group.name}
          </SelectItem>
        ))}
        <SelectItem
          key="create-group"
          value="create-group"
          className="text-muted-foreground"
        >
          + Create new group
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
