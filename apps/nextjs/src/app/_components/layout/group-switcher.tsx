"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSelectedLayoutSegments } from "next/navigation";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

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
  const segments = useSelectedLayoutSegments();

  // Get IDs from segments
  const groupIndex = segments.indexOf("group") + 1;
  const currentGroupId = segments[groupIndex]
    ? parseInt(segments[groupIndex])
    : null;

  const shoppingListIndex = segments.indexOf("shopping-list") + 1;
  const currentShoppingListId = segments[shoppingListIndex]
    ? parseInt(segments[shoppingListIndex])
    : null;

  const trpc = useTRPC();
  const { data: userWithGroups } = useSuspenseQuery(
    trpc.shoppingList.getCurrentUserWithGroups.queryOptions(),
  );
  const updateLastUsed = useMutation(
    trpc.shoppingList.updateLastUsed.mutationOptions(),
  );
  const hasUpdated = useRef(segments.join("/"));

  useEffect(() => {
    if (!userWithGroups.success) {
      return;
    }
    const currentPath = segments.join("/");

    if (hasUpdated.current !== currentPath && userWithGroups.data.user) {
      const needsUpdate =
        (currentGroupId &&
          userWithGroups.data.user.lastGroupUsed?.id !== currentGroupId) ??
        (currentShoppingListId &&
          userWithGroups.data.user.lastShoppingListUsed?.id !==
            currentShoppingListId);

      if (needsUpdate) {
        updateLastUsed.mutate({
          groupId: currentGroupId,
          shoppingListId: currentShoppingListId,
        });
        hasUpdated.current = currentPath;
      }
    }
  }, [
    segments,
    currentGroupId,
    currentShoppingListId,
    updateLastUsed,
    userWithGroups,
    userWithGroups.success,
  ]);

  const handleGroupChange = (groupId: string) => {
    if (groupId === "create-group") {
      router.push("/group/create");
      return;
    }

    // If we're in a shopping list context, always go to group home
    if (segments.includes("shopping-list")) {
      router.push(`/group/${groupId}`);
      return;
    }

    // If we're already in a group context, replace the group ID
    if (currentGroupId) {
      const newPath = `/group/${groupId}${segments.slice(groupIndex + 1).join("/")}`;
      router.push(newPath);
    } else {
      // If we're not in a group context, go to the group's home page
      router.push(`/group/${groupId}`);
    }
  };

  if (!userWithGroups.success) {
    return handleApiError(userWithGroups.error);
  }

  return (
    <Select
      value={currentGroupId?.toString() ?? ""}
      onValueChange={handleGroupChange}
    >
      <SelectTrigger className="w-[400px]">
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
