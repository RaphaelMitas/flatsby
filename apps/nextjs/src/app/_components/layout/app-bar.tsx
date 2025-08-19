import Link from "next/link";

import HomeIcon from "@flatsby/ui/custom/icons/HomeIcon";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { GroupSwitcher } from "./group-switcher";
import { UserButton } from "./user-button";

export function AppBar() {
  prefetch(trpc.shoppingList.getCurrentUserWithGroups.queryOptions());

  return (
    <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
      <Link className="flex items-center gap-2" href="/">
        <HomeIcon className="h-6 w-10 text-primary" />
        <span className="hidden text-lg font-bold md:block">Flatsby</span>
      </Link>
      <HydrateClient>
        <GroupSwitcher />
        <UserButton />
      </HydrateClient>
    </div>
  );
}
