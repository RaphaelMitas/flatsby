import { Skeleton } from "@flatsby/ui/skeleton";

export default function ShoppingListDetailLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        {/* Title skeleton */}
        <div className="flex justify-center py-2">
          <Skeleton className="h-7 w-48" />
        </div>

        <div className="space-y-2 px-4 pt-4">
          {/* Section title */}
          <div className="flex justify-center">
            <Skeleton className="h-5 w-16" />
          </div>

          {/* Shopping list items */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-muted flex items-center gap-3 rounded-lg p-4"
            >
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}

          {/* Purchased section */}
          <div className="flex justify-center pt-4">
            <Skeleton className="h-5 w-32" />
          </div>

          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`checked-${i}`}
              className="bg-muted flex items-center gap-3 rounded-lg p-4"
            >
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Add form skeleton */}
      <div className="bg-background sticky bottom-0 p-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
