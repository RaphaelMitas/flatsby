"use client";

import { GroupHeader } from "./group-header";
import { HomeStats } from "./home-stats";
import { NavLinks } from "./nav-links";
import { QuickActions } from "./quick-actions";

export function HomeContent() {
  return (
    <div className="mx-auto flex w-full max-w-prose flex-col gap-6 p-4">
      <GroupHeader />

      <HomeStats />

      <QuickActions />

      <NavLinks />
    </div>
  );
}
