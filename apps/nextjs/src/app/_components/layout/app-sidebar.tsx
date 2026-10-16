"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Calendar,
  HandCoins,
  LoaderIcon,
  MessageSquareIcon,
  PlusIcon,
  TrashIcon,
  Wallet,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { localePath } from "@flatsby/i18n/locale";
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
import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { SidebarCreditsDisplay } from "./sidebar-credits-display";
import { SidebarGroupSwitcher } from "./sidebar-group-switcher";
import { SidebarShoppingListSwitcher } from "./sidebar-shopping-list-switcher";
import { SidebarThemeToggle } from "./sidebar-theme-toggle";
import { SidebarUserMenu } from "./sidebar-user-menu";

export function AppSidebar() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { hasCurrentGroup } = useGroupContext();

  // Determine active pages based on pathname
  const isExpensesPage = pathname.startsWith("/expenses");
  const isDebtsPage = pathname === "/expenses/debts";
  const isCalendarPage = pathname.startsWith("/calendar");

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
      { limit: PAGE_SIZE.conversations },
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
          trpc.chat.getUserConversations.infiniteQueryKey({
            limit: PAGE_SIZE.conversations,
          }),
        );

        queryClient.setQueryData(
          trpc.chat.getUserConversations.infiniteQueryKey({
            limit: PAGE_SIZE.conversations,
          }),
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
            trpc.chat.getUserConversations.infiniteQueryKey({
              limit: PAGE_SIZE.conversations,
            }),
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
            <SidebarGroupLabel>{t("navigation.expenses")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isExpensesPage && !isDebtsPage}
                    tooltip={t("navigation.expenses")}
                  >
                    <Link href="/expenses">
                      <Wallet />
                      <span>{t("navigation.allExpenses")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isDebtsPage}
                    tooltip={t("navigation.debts")}
                  >
                    <Link href="/expenses/debts">
                      <HandCoins />
                      <span>{t("navigation.debts")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasCurrentGroup && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("navigation.calendar")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isCalendarPage}
                    tooltip={t("navigation.calendar")}
                  >
                    <Link href="/calendar">
                      <Calendar />
                      <span>{t("navigation.calendar")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation.chat")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t("navigation.newChat")}>
                  <Link href="/chat">
                    <PlusIcon />
                    <span>{t("navigation.newChat")}</span>
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
                    {t("navigation.noConversations")}
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
                          tooltip={
                            conversation.title ?? t("navigation.newChat")
                          }
                        >
                          <Link href={`/chat/${conversation.id}`}>
                            <MessageSquareIcon />
                            <span className="truncate">
                              {conversation.title ?? t("navigation.newChat")}
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
                          <span className="sr-only">{t("common.delete")}</span>
                        </SidebarMenuAction>
                      </SidebarMenuItem>
                    ))}
                  {hasNextPage && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        tooltip={t("navigation.loadMore")}
                      >
                        {isFetchingNextPage ? (
                          <LoaderIcon className="animate-spin" />
                        ) : (
                          <span className="text-muted-foreground">
                            {t("navigation.loadMoreEllipsis")}
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
        <div className="text-muted-foreground flex flex-wrap justify-center gap-x-3 gap-y-1 px-2 py-2 text-xs group-data-[collapsible=icon]:hidden">
          <Link
            href={localePath(locale, "/legal/legal-notice")}
            className="hover:underline"
          >
            {t("navigation.legalNotice")}
          </Link>
          <Link
            href={localePath(locale, "/legal/privacy")}
            className="hover:underline"
          >
            {t("navigation.privacy")}
          </Link>
          <Link
            href={localePath(locale, "/legal/terms")}
            className="hover:underline"
          >
            {t("navigation.terms")}
          </Link>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
