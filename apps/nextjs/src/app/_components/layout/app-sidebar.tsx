"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareIcon, PlusIcon, Receipt, Wallet } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
} from "@flatsby/ui/sidebar";

import { useGroupContext } from "~/app/_components/context/group-context";
import { CreateChatDialog } from "~/app/chat/_components/create-chat-dialog";
import { useTRPC } from "~/trpc/react";
import { SidebarGroupSwitcher } from "./sidebar-group-switcher";
import { SidebarShoppingListSwitcher } from "./sidebar-shopping-list-switcher";
import { SidebarThemeToggle } from "./sidebar-theme-toggle";
import { SidebarUserMenu } from "./sidebar-user-menu";

export function AppSidebar() {
  const pathname = usePathname();
  const trpc = useTRPC();
  const { hasCurrentGroup } = useGroupContext();

  // Determine active pages based on pathname
  const isExpensesPage = pathname.startsWith("/expenses");
  const isDebtsPage = pathname === "/expenses/debts";

  // Get current conversation ID from pathname
  const conversationMatch = /\/chat\/([^/]+)/.exec(pathname);
  const currentConversationId = conversationMatch?.[1] ?? null;

  // Get conversations for chat section
  const { data: conversations, isLoading: conversationsLoading } = useQuery(
    trpc.chat.getUserConversations.queryOptions({ limit: 50 }),
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarGroupSwitcher />

      <SidebarContent>
        {/* Shopping Lists (when a group is selected) */}
        {hasCurrentGroup && <SidebarShoppingListSwitcher />}

        {/* Expenses (when a group is selected) */}
        {hasCurrentGroup && (
          <SidebarGroup>
            <SidebarGroupLabel>Expenses</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isExpensesPage && !isDebtsPage}
                    tooltip="Expenses"
                  >
                    <Link href="/expenses">
                      <Receipt />
                      <span>All Expenses</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isDebtsPage}
                    tooltip="Debts"
                  >
                    <Link href="/expenses/debts">
                      <Wallet />
                      <span>Debts</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Chat */}
        <SidebarGroup>
          <SidebarGroupLabel>Chat</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <CreateChatDialog>
                  <SidebarMenuButton tooltip="New Chat">
                    <PlusIcon />
                    <span>New Chat</span>
                  </SidebarMenuButton>
                </CreateChatDialog>
              </SidebarMenuItem>

              {conversationsLoading ? (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                </>
              ) : conversations?.items.length === 0 ? (
                <SidebarMenuItem>
                  <div className="text-muted-foreground px-2 py-1 text-sm">
                    No conversations yet
                  </div>
                </SidebarMenuItem>
              ) : (
                conversations?.items.map((conversation) => (
                  <SidebarMenuItem key={conversation.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={conversation.id === currentConversationId}
                      tooltip={conversation.title ?? "New Chat"}
                    >
                      <Link href={`/chat/${conversation.id}`}>
                        <MessageSquareIcon />
                        <span className="truncate">
                          {conversation.title ?? "New Chat"}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarUserMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
