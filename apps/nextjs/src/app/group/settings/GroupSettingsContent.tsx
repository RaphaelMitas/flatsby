"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Skeleton } from "@flatsby/ui/skeleton";

import { useGroupContext } from "~/app/_components/context/group-context";
import DangerZone from "./DangerZone";
import GroupDetails from "./GroupDetails";
import ManageMembers from "./ManageMembers";

export function GroupSettingsContent() {
  const router = useRouter();
  const { currentGroup, isLoading } = useGroupContext();

  useEffect(() => {
    if (!isLoading && !currentGroup) {
      router.replace("/group");
    }
  }, [isLoading, currentGroup, router]);

  if (isLoading || !currentGroup) {
    return <GroupSettingsLoading />;
  }

  const groupId = currentGroup.id;

  return (
    <div className="flex h-full flex-col p-4 md:pt-16">
      <div className="mx-auto grid w-full max-w-6xl items-start gap-2 lg:grid-cols-[1fr]">
        <div className="mx-auto grid w-full max-w-6xl gap-2">
          <h1 className="text-center text-3xl font-semibold">Group Settings</h1>
        </div>
        <div className="grid gap-6"></div>
        <GroupDetails groupId={groupId} />
        <ManageMembers groupId={groupId} />
        <DangerZone groupId={groupId} />
      </div>
    </div>
  );
}

function GroupSettingsLoading() {
  return (
    <div className="flex h-full flex-col p-4 md:pt-16">
      <div className="mx-auto grid w-full max-w-6xl items-start gap-2 lg:grid-cols-[1fr]">
        <div className="mx-auto grid w-full max-w-6xl gap-2">
          <div className="flex justify-center">
            <Skeleton className="h-9 w-40" />
          </div>
        </div>
        <div className="grid gap-6"></div>
        <div className="bg-muted space-y-4 rounded-lg p-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="bg-muted space-y-4 rounded-lg p-6">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="bg-muted space-y-4 rounded-lg p-6">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
