"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { House, KeyRound, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { useGroupContext } from "~/app/_components/context/group-context";
import { PeekingCat } from "~/app/_components/peeking-cat";
import { season } from "~/app/_components/seasonal/season";
import { Switcher } from "~/app/_components/switcher/Switcher";
import { SwitcherSettingsButton } from "~/app/_components/switcher/SwitcherSettingsButton";
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

  const groups = data?.success ? data.data : [];
  const memberCount = (count: number) => t("group.memberCount", { count });
  const current = groups.find(({ id }) => id === currentGroup.id);
  const Backdrop = season.HomeBackdrop;

  const header = (
    <div className="flex items-stretch gap-3">
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
          // Settings act on the selected group, so only its own row offers them
          more:
            group.id === currentGroup.id
              ? {
                  label: t("navigation.groupSettings"),
                  onSelect: () => router.push("/group/settings"),
                }
              : undefined,
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

      <SwitcherSettingsButton
        testId="home-group-settings"
        label={t("navigation.groupSettings")}
        href="/group/settings"
      />
      <JoinWithCodeDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  );

  if (!Backdrop) return header;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <Backdrop />
      <div className="relative p-4 pb-28">{header}</div>
      {/* Lines up with the gap the skyline leaves next to its right edge */}
      <PeekingCat
        variant="home"
        className="absolute right-8 bottom-4 h-8 w-16"
      />
    </div>
  );
}
