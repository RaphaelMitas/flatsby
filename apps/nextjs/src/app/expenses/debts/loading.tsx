import { Skeleton } from "@flatsby/ui/skeleton";

export default function DebtsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-prose flex-col gap-6 p-4 md:p-6">
      <Skeleton className="h-8 w-24" />

      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <div className="divide-y rounded-xl border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <div className="space-y-3 rounded-xl border p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
