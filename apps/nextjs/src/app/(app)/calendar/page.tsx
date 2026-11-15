import { Suspense } from "react";

import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";

import {
  getCurrentGroupId,
  HydrateClient,
  prefetch,
  trpc,
} from "~/trpc/server";
import { CalendarView } from "./CalendarView";

export default async function CalendarPage() {
  const groupId = await getCurrentGroupId();

  prefetch(trpc.group.getGroup.queryOptions({ id: groupId }));

  return (
    <HydrateClient>
      <div className="flex h-full flex-1 flex-col">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <LoadingSpinner />
            </div>
          }
        >
          <CalendarView />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
