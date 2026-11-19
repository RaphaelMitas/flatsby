"use client";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useToday } from "~/app/_components/local-clock";
import { PeekingCat } from "~/app/_components/peeking-cat";
import { season } from "~/app/_components/seasonal/season";
import { AnalyticsNotice } from "./analytics-notice";
import { CalendarCard } from "./calendar-card";
import { ExpensesCard } from "./expenses-card";
import { GroupHeader } from "./group-header";
import { InviteFlatmatesCard } from "./invite-flatmates-card";
import { PinboardCard } from "./pinboard-card";
import { ShoppingCard } from "./shopping-card";

export function HomeContent() {
  const { currentGroup } = useGroupContext();
  const today = useToday();
  const groupId = currentGroup?.id;

  return (
    <div className="mx-auto flex w-full max-w-prose flex-col gap-6 p-4">
      <GroupHeader />

      <InviteFlatmatesCard />

      <AnalyticsNotice />

      {groupId !== undefined && (
        <div className="flex flex-col gap-4">
          <div>
            {!season.HomeBackdrop && (
              <PeekingCat variant="home" className="mr-8 ml-auto h-8 w-16" />
            )}
            <PinboardCard groupId={groupId} />
          </div>
          <ExpensesCard groupId={groupId} today={today} />
          <ShoppingCard groupId={groupId} today={today} />
          <CalendarCard groupId={groupId} today={today} />
        </div>
      )}
    </div>
  );
}
