"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Plus, Settings, Users } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@flatsby/ui/dropdown-menu";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@flatsby/ui/sidebar";

import { useGroupContext } from "~/app/_components/context/group-context";

export function SidebarGroupSwitcher() {
  const pathname = usePathname();
  const { currentGroup, groups, isLoading, switchGroup, hasCurrentGroup } =
    useGroupContext();

  const isGroupPage = pathname === "/group";
  const isGroupSettingsPage = pathname === "/group/settings";
  const isGroupCreatePage = pathname === "/group/create";

  if (isLoading) {
    return (
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuSkeleton showIcon />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
    );
  }

  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton>
                <Users />
                <span className="truncate">
                  {currentGroup?.name ?? "Select Group"}
                </span>
                <ChevronDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[--radix-popper-anchor-width]">
              {groups.map((group) => (
                <DropdownMenuItem
                  key={group.id}
                  onClick={() => void switchGroup(group.id)}
                >
                  <span className="truncate">{group.name}</span>
                  {currentGroup?.id === group.id && (
                    <Check className="ml-auto size-4" />
                  )}
                </DropdownMenuItem>
              ))}

              {groups.length > 0 && <DropdownMenuSeparator />}

              <DropdownMenuItem asChild>
                <Link href="/group">
                  <Users className="mr-2 size-4" />
                  <span>All Groups</span>
                  {isGroupPage && <Check className="ml-auto size-4" />}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/group/create">
                  <Plus className="mr-2 size-4" />
                  <span>Create Group</span>
                  {isGroupCreatePage && <Check className="ml-auto size-4" />}
                </Link>
              </DropdownMenuItem>

              {hasCurrentGroup && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/group/settings">
                      <Settings className="mr-2 size-4" />
                      <span>Group Settings</span>
                      {isGroupSettingsPage && <Check className="ml-auto size-4" />}
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
