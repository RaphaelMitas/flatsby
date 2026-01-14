import { Skeleton } from "@flatsby/ui/skeleton";

export default function ExpenseDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-prose flex-col gap-4 p-4 md:p-6">
      {/* Header with back and actions */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-16" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      {/* Main card */}
      <div className="bg-muted space-y-4 rounded-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>

          <Skeleton className="h-px w-full" />

          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-5 w-36" />
            </div>
          </div>
        </div>
      </div>

      {/* Split details card */}
      <div className="bg-muted space-y-4 rounded-lg p-6">
        <div className="space-y-1">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-40" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Created by card */}
      <div className="bg-muted rounded-lg p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}
