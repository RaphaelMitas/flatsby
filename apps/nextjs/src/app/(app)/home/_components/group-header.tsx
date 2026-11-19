"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChartNoAxesColumn,
  House,
  KeyRound,
  Plus,
  Settings,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useGroupContext } from "~/app/_components/context/group-context";
import { PeekingCat } from "~/app/_components/peeking-cat";
import { season } from "~/app/_components/seasonal/season";
import { Switcher } from "~/app/_components/switcher/Switcher";
import { SwitcherIconButton } from "~/app/_components/switcher/SwitcherIconButton";
import { JoinWithCodeDialog } from "~/app/(app)/group/JoinWithCodeDialog";
import { useHomeCardOpened } from "./home-card";

export function GroupHeader() {
  const t = useTranslations();
  const router = useRouter();
  const { currentGroup, groups, switchGroup } = useGroupContext();
  const [isSwitching, setIsSwitching] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const opened = useHomeCardOpened(currentGroup?.id ?? 0);

  if (!currentGroup) {
    return null;
  }

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

      <SwitcherIconButton
        testId="home-statistics"
        icon={ChartNoAxesColumn}
        label={t("statistics.title")}
        href="/home/statistics"
        onClick={() => opened("statistics")}
      />
      <SwitcherIconButton
        testId="home-group-settings"
        icon={Settings}
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
      <PeekingCat
        variant="home"
        className="absolute right-8 bottom-4 h-8 w-16"
      />
    </div>
  );
}
