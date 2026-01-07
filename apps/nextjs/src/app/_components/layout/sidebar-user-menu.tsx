"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useCustomer } from "autumn-js/react";
import { ChevronsUpDown, LogOut, Settings, Snowflake } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@flatsby/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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

import { useWinterEffects } from "~/app/_components/layout/winterTheme/use-winter-effects";
import { useTRPC } from "~/trpc/react";

export function SidebarUserMenu() {
  const { isMobile } = useSidebar();
  const { isEnabled, setEnabled } = useWinterEffects();
  const trpc = useTRPC();
  const { customer } = useCustomer();

  const planName = customer?.products[0]?.name ?? "Free";

  const { data: userWithGroups } = useQuery(
    trpc.user.getCurrentUserWithGroups.queryOptions(),
  );

  if (!userWithGroups?.success) {
    return null;
  }

  const user = userWithGroups.data.user;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user?.image ?? undefined} alt={user?.name} />
                <AvatarFallback className="rounded-lg">
                  {user?.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{user?.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {planName}
                  </span>
                </div>
                <span className="text-muted-foreground truncate text-xs">
                  {user?.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/user-settings" className="cursor-pointer">
                  <Settings className="mr-2 size-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setEnabled((prev) => !prev)}
                className="cursor-pointer"
              >
                <Snowflake className="mr-2 size-4" />
                Winter Effects {isEnabled ? "(On)" : "(Off)"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/auth/logout" className="cursor-pointer">
                <LogOut className="mr-2 size-4" />
                Log out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
