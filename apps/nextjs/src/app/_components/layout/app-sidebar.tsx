"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  LoaderIcon,
  MessageSquareIcon,
  PlusIcon,
  Receipt,
  TrashIcon,
  Wallet,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
} from "@flatsby/ui/sidebar";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { SidebarCreditsDisplay } from "./sidebar-credits-display";
import { SidebarGroupSwitcher } from "./sidebar-group-switcher";
import { SidebarShoppingListSwitcher } from "./sidebar-shopping-list-switcher";
import { SidebarThemeToggle } from "./sidebar-theme-toggle";
import { SidebarUserMenu } from "./sidebar-user-menu";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { hasCurrentGroup } = useGroupContext();

  // Determine active pages based on pathname
  const isExpensesPage = pathname.startsWith("/expenses");
  const isDebtsPage = pathname === "/expenses/debts";

  // Get current conversation ID from pathname
  const conversationMatch = /\/chat\/([^/]+)/.exec(pathname);
  const currentConversationId = conversationMatch?.[1] ?? null;

  // Get conversations for chat section with infinite loading
  const {
    data: conversations,
    isLoading: conversationsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(
    trpc.chat.getUserConversations.infiniteQueryOptions(
      { limit: 10 },
      { getNextPageParam: (lastPage) => lastPage.nextCursor },
    ),
  );

  // Delete conversation mutation with optimistic update
  const deleteConversation = useMutation(
    trpc.chat.deleteConversation.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({
          queryKey: trpc.chat.getUserConversations.infiniteQueryKey(),
        });

        const previousData = queryClient.getQueryData(
          trpc.chat.getUserConversations.infiniteQueryKey({ limit: 10 }),
        );

        queryClient.setQueryData(
          trpc.chat.getUserConversations.infiniteQueryKey({ limit: 10 }),
          (old: typeof previousData) =>
            old
              ? {
                  ...old,
                  pages: old.pages.map((page) => ({
                    ...page,
                    items: page.items.filter(
                      (c) => c.id !== variables.conversationId,
                    ),
                  })),
                }
              : old,
        );

        if (variables.conversationId === currentConversationId) {
          router.push("/chat");
        }

        return { previousData };
      },
      onError: (_err, _variables, context) => {
        if (context?.previousData) {
          queryClient.setQueryData(
            trpc.chat.getUserConversations.infiniteQueryKey({ limit: 10 }),
            context.previousData,
          );
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.chat.getUserConversations.infiniteQueryKey(),
        });
      },
    }),
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarGroupSwitcher />

      <SidebarContent>
        {hasCurrentGroup && <SidebarShoppingListSwitcher />}

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

        <SidebarGroup>
          <SidebarGroupLabel>Chat</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="New Chat">
                  <Link href="/chat">
                    <PlusIcon />
                    <span>New Chat</span>
                  </Link>
                </SidebarMenuButton>
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
              ) : conversations?.pages[0]?.items.length === 0 ? (
                <SidebarMenuItem>
                  <div className="text-muted-foreground px-2 py-1 text-sm">
                    No conversations yet
                  </div>
                </SidebarMenuItem>
              ) : (
                <>
                  {conversations?.pages
                    .flatMap((page) => page.items)
                    .map((conversation) => (
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
                        <SidebarMenuAction
                          showOnHover
                          onClick={() =>
                            deleteConversation.mutate({
                              conversationId: conversation.id,
                            })
                          }
                          disabled={deleteConversation.isPending}
                        >
                          <TrashIcon />
                          <span className="sr-only">Delete</span>
                        </SidebarMenuAction>
                      </SidebarMenuItem>
                    ))}
                  {hasNextPage && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        tooltip="Load more"
                      >
                        {isFetchingNextPage ? (
                          <LoaderIcon className="animate-spin" />
                        ) : (
                          <span className="text-muted-foreground">
                            Load more...
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </>
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
          <SidebarCreditsDisplay />
          <SidebarUserMenu />
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
