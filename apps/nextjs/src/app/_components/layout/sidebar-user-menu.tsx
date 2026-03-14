"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useCustomer } from "autumn-js/react";
import { ChevronsUpDown, Flower2, LogOut, Settings } from "lucide-react";

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
import { UserAvatar } from "@flatsby/ui/user-avatar";
import { getCurrentSubscription } from "@flatsby/validators/billing";

import { useSpringEffects } from "~/app/_components/layout/springTheme/use-spring-effects";
import { signOutAndRedirect } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

export function SidebarUserMenu() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { isEnabled, setEnabled } = useSpringEffects();
  const trpc = useTRPC();
  const { data: customer } = useCustomer({
    expand: ["subscriptions.plan"],
  });

  const planName =
    getCurrentSubscription(customer?.subscriptions ?? [])?.plan?.name ?? "Free";

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
              <UserAvatar
                name={user?.name ?? ""}
                image={user?.image}
                size="md"
                className="rounded-lg"
              />
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
                <Flower2 className="mr-2 size-4" />
                Spring Effects {isEnabled ? "(On)" : "(Off)"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOutAndRedirect(router)}>
              <LogOut className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
