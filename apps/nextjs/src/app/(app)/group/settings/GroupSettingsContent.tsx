"use client";

import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";

import { useGroupContext } from "~/app/_components/context/group-context";
import DangerZone from "./DangerZone";
import ExpenseSettings from "./ExpenseSettings";
import GroupDetails from "./GroupDetails";
import ImportExpenses from "./ImportExpenses";
import ManageMembers from "./ManageMembers";

export function GroupSettingsContent() {
  const t = useTranslations("navigation");
  const { currentGroup } = useGroupContext();

  if (!currentGroup) {
    redirect("/group");
  }

  const groupId = currentGroup.id;

  return (
    <div className="flex h-full flex-col p-4 md:pt-16">
      <div className="mx-auto grid w-full max-w-6xl items-start gap-2 lg:grid-cols-[1fr]">
        <div className="mx-auto grid w-full max-w-6xl gap-2">
          <h1
            className="text-center text-3xl font-semibold"
            data-testid="group-settings-title"
          >
            {t("groupSettings")}
          </h1>
        </div>
        <div className="grid gap-6"></div>
        <GroupDetails groupId={groupId} />
        <ManageMembers groupId={groupId} />
        <ExpenseSettings groupId={groupId} />
        <ImportExpenses groupId={groupId} groupName={currentGroup.name} />
        <DangerZone groupId={groupId} />
      </div>
    </div>
  );
}
