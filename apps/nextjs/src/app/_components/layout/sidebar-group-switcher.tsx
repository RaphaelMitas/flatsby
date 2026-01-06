"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSelectedLayoutSegments } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, Plus, Users } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@flatsby/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@flatsby/ui/sidebar";

import { useTRPC } from "~/trpc/react";

export function SidebarGroupSwitcher() {
  const router = useRouter();
  const segments = useSelectedLayoutSegments();
  const { isMobile } = useSidebar();

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
  const { data: userWithGroups } = useQuery(
    trpc.user.getCurrentUserWithGroups.queryOptions(),
  );
  const updateLastUsed = useMutation(
    trpc.shoppingList.updateLastUsed.mutationOptions(),
  );
  const hasUpdated = useRef(segments.join("/"));

  useEffect(() => {
    if (!userWithGroups?.success) {
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
  ]);

  const handleGroupChange = (groupId: number) => {
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

  if (!userWithGroups?.success) {
    return null;
  }

  const currentGroup = userWithGroups.data.groups.find(
    (g) => g.id === currentGroupId,
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Users className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {currentGroup?.name ?? "Select Group"}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {userWithGroups.data.groups.length} group
                  {userWithGroups.data.groups.length !== 1 ? "s" : ""}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            {userWithGroups.data.groups.map((group) => (
              <DropdownMenuItem
                key={group.id}
                onClick={() => handleGroupChange(group.id)}
                className="cursor-pointer gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <Users className="size-4 shrink-0" />
                </div>
                {group.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/group/create")}
              className="cursor-pointer gap-2 p-2"
            >
              <div className="bg-background flex size-6 items-center justify-center rounded-md border">
                <Plus className="size-4" />
              </div>
              <span className="text-muted-foreground font-medium">
                Create group
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
