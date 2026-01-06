"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareIcon, PlusIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
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
import { CreateChatDialog } from "./create-chat-dialog";

export function ChatSidebar() {
  const params = useParams<{ conversationId?: string }>();
  const currentConversationId = params.conversationId;
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.chat.getUserConversations.queryOptions({ limit: 50 }),
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <CreateChatDialog>
              <SidebarMenuButton tooltip="New Chat">
                <PlusIcon />
                <span>New Chat</span>
              </SidebarMenuButton>
            </CreateChatDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                </>
              ) : data?.items.length === 0 ? (
                <SidebarMenuItem>
                  <div className="text-muted-foreground px-2 py-1 text-sm">
                    No conversations yet
                  </div>
                </SidebarMenuItem>
              ) : (
                data?.items.map((conversation) => (
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

      <SidebarRail />
    </Sidebar>
  );
}
