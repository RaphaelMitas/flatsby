"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import type { AppSection } from "./app-layout";
import {
  MessageSquareIcon,
  PlusIcon,
  Receipt,
  ShoppingCartIcon,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
} from "@flatsby/ui/sidebar";

import { useTRPC } from "~/trpc/react";
import { CreateChatDialog } from "~/app/chat/_components/create-chat-dialog";
import { SidebarGroupSwitcher } from "./sidebar-group-switcher";
import { SidebarThemeToggle } from "./sidebar-theme-toggle";
import { SidebarUserMenu } from "./sidebar-user-menu";

interface AppSidebarProps {
  section: AppSection;
}

export function AppSidebar({ section }: AppSidebarProps) {
  const segments = useSelectedLayoutSegments();
  const trpc = useTRPC();

  // Determine active pages based on section and segments
  const isChatPage = section === "chat";
  const isGroupSelectPage = section === "group" && segments.length === 0;
  const isShoppingPage = segments.includes("shopping-list");
  const isExpensesPage = segments.includes("expenses");

  // Get current group ID from segments (e.g., ["123", "shopping-list"])
  const currentGroupId = section === "group" && segments[0]
    ? parseInt(segments[0])
    : null;

  // Get current conversation ID from segments (e.g., ["abc123"])
  const currentConversationId = section === "chat" ? segments[0] ?? null : null;

  // Get user data for last used group
  const { data: userWithGroups } = useQuery(
    trpc.user.getCurrentUserWithGroups.queryOptions(),
  );

  // Get conversations for chat section
  const { data: conversations, isLoading: conversationsLoading } = useQuery(
    trpc.chat.getUserConversations.queryOptions({ limit: 50 }),
  );

  // Determine which group ID to use for navigation links
  const lastGroupId =
    currentGroupId ??
    (userWithGroups?.success
      ? userWithGroups.data.user?.lastGroupUsed?.id
      : null) ??
    null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarGroupSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isGroupSelectPage}
                  tooltip="Groups"
                >
                  <Link href="/group">
                    <Users />
                    <span>Groups</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {lastGroupId && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isShoppingPage}
                      tooltip="Shopping"
                    >
                      <Link href={`/group/${lastGroupId}/shopping-list`}>
                        <ShoppingCartIcon />
                        <span>Shopping</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isExpensesPage}
                      tooltip="Expenses"
                    >
                      <Link href={`/group/${lastGroupId}/expenses`}>
                        <Receipt />
                        <span>Expenses</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isChatPage}
                  tooltip="Chat"
                >
                  <Link href="/chat">
                    <MessageSquareIcon />
                    <span>Chat</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Chat Conversations (when on chat pages) */}
        {isChatPage && (
          <SidebarGroup>
            <SidebarGroupLabel>Conversations</SidebarGroupLabel>
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
        )}
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
