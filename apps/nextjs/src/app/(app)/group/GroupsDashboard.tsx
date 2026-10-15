"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";

import { useTRPC } from "~/trpc/react";
import { useHandleApiError } from "~/utils";
import { GroupsDashboardElement } from "./GroupsDashboardElement";
import { JoinWithCodeDialog } from "./JoinWithCodeDialog";

export function GroupsDashboard() {
  const t = useTranslations();
  const trpc = useTRPC();
  const [joinOpen, setJoinOpen] = useState(false);
  const router = useRouter();
  const handleApiError = useHandleApiError();

  const { data: groups, status } = useSuspenseQuery(
    trpc.group.getUserGroups.queryOptions(),
  );

  const selectGroup = useMutation(
    trpc.shoppingList.updateLastUsed.mutationOptions({
      onSuccess: () => {
        router.push("/home");
      },
    }),
  );

  if (!groups.success) {
    return handleApiError(groups.error);
  }

  const handleSelectGroup = (groupId: number) => {
    selectGroup.mutate({ groupId, shoppingListId: null });
  };

  return (
    <section className="mx-auto h-full w-full max-w-prose">
      <div className="flex h-full w-full flex-col gap-6 p-4 md:p-6">
        <div className="flex h-fit flex-wrap items-center justify-between gap-2">
          <h2
            className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl"
            data-testid="group-dashboard-title"
          >
            {t("group.dashboard.title")}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              data-testid="group-join-with-code-button"
              onClick={() => setJoinOpen(true)}
            >
              {t("invite.join.withCode")}
            </Button>
            <Button asChild>
              <Link href="/group/create" data-testid="group-create-link">
                {t("navigation.createGroup")}
              </Link>
            </Button>
          </div>
          <JoinWithCodeDialog open={joinOpen} onOpenChange={setJoinOpen} />
        </div>

        {status === "success" && groups.data.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="text-center text-lg font-semibold">
              {t("group.dashboard.notAMember")}
            </div>
            <Button asChild className="mx-auto grid max-w-6xl gap-2">
              <Link
                href="/group/create"
                data-testid="group-empty-create-button"
              >
                {t("group.create.title")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {groups.data.map((group) => (
              <GroupsDashboardElement
                key={group.id}
                groupId={group.id}
                groupName={group.name}
                memberCount={group.memberCount}
                onSelect={handleSelectGroup}
                disabled={selectGroup.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
