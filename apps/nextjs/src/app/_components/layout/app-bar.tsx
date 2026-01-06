import Link from "next/link";
import { MessageSquareIcon } from "lucide-react";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { DesktopNavigation } from "./desktop-navigation";
import { GroupSwitcher } from "./group-switcher";
import { HomeLink } from "./home-link";
import { UserButton } from "./user-button";

export function AppBar() {
  prefetch(trpc.user.getCurrentUserWithGroups.queryOptions());

  return (
    <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
      <HydrateClient>
        <div className="flex items-center gap-6">
          <HomeLink />
          <DesktopNavigation />
        </div>
        <GroupSwitcher />
        <div className="flex items-center gap-2">
          <Link
            href="/chat"
            className="hover:bg-accent hover:text-accent-foreground text-muted-foreground hidden items-center gap-2 rounded-md p-2 transition-colors md:flex"
          >
            <MessageSquareIcon className="h-5 w-5" />
            <span className="sr-only">Chat</span>
          </Link>
          <UserButton />
        </div>
      </HydrateClient>
    </div>
  );
}
