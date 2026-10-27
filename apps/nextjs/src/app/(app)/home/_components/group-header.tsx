"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { House, KeyRound, Plus, Settings } from "lucide-react";
import { useTranslations } from "next-intl";

import { useGroupContext } from "~/app/_components/context/group-context";
import { Switcher } from "~/app/_components/switcher/Switcher";
import { JoinWithCodeDialog } from "~/app/(app)/group/JoinWithCodeDialog";
import { useTRPC } from "~/trpc/react";

export function GroupHeader() {
  const t = useTranslations();
  const router = useRouter();
  const trpc = useTRPC();
  const { currentGroup, switchGroup } = useGroupContext();
  const [isSwitching, setIsSwitching] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const { data } = useQuery(trpc.group.getUserGroups.queryOptions());

  if (!currentGroup) {
    return null;
  }

  // A group still being created has a placeholder id and can't be selected yet
  const groups = (data?.success ? data.data : []).filter(({ id }) => id > 0);
  const memberCount = (count: number) => t("group.memberCount", { count });
  const current = groups.find(({ id }) => id === currentGroup.id);

  return (
    <div className="flex items-center gap-3">
      <Switcher
        testId="home-group-switcher"
        icon={House}
        title={currentGroup.name}
        subtitle={current ? memberCount(current.memberCount) : ""}
        menuTitle={t("group.switcher.title")}
        items={groups.map((group) => ({
          id: group.id,
          title: group.name,
          subtitle: memberCount(group.memberCount),
        }))}
        selectedId={currentGroup.id}
        onSelect={async (group) => {
          if (group.id === currentGroup.id) return;
          setIsSwitching(true);
          await switchGroup(group.id);
          setIsSwitching(false);
        }}
        actions={[
          {
            testId: "home-group-switcher-create",
            icon: Plus,
            title: t("home.createGroup"),
            onSelect: () => router.push("/group/create"),
          },
          {
            testId: "home-group-switcher-join",
            icon: KeyRound,
            title: t("invite.join.withCode"),
            onSelect: () => setJoinOpen(true),
          },
        ]}
        disabled={isSwitching}
      />

      <Link
        href="/group/settings"
        aria-label={t("navigation.groupSettings")}
        className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-md border shadow-sm"
      >
        <Settings className="h-4 w-4" />
      </Link>
      <JoinWithCodeDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  );
}
