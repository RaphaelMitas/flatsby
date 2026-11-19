import { Suspense } from "react";

import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";

import {
  getCurrentGroupId,
  HydrateClient,
  prefetch,
  trpc,
} from "~/trpc/server";
import { Pinboard } from "./Pinboard";

export default async function PinboardPage() {
  const groupId = await getCurrentGroupId();

  prefetch(trpc.pinboard.list.queryOptions({ groupId }));

  return (
    <HydrateClient>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner />
          </div>
        }
      >
        <Pinboard />
      </Suspense>
    </HydrateClient>
  );
}
