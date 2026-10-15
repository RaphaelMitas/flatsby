import { Skeleton } from "@flatsby/ui/skeleton";

export default function ShoppingListLoading() {
  return (
    <div className="mx-auto mt-4 flex w-full max-w-prose flex-col gap-4 p-4">
      {/* Create form skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Shopping list items skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
