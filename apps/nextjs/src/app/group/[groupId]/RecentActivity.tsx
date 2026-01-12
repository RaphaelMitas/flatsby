"use client";

import type { ActivityItem } from "@flatsby/validators/group";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, Info, ListTodo, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  }
  // For older items, show date
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function ActivityItemComponent({ activity }: { activity: ActivityItem }) {
  const userName = activity.user.name;
  const relativeTime = formatRelativeTime(activity.timestamp);

  let IconComponent: typeof Wallet;
  let description: string;

  if (activity.type === "expense") {
    IconComponent = Wallet;
    const formattedAmount = formatCurrencyFromCents({
      cents: activity.data.amountInCents,
      currency: activity.data.currency,
    });
    const descriptionText = activity.data.description
      ? ` - ${activity.data.description}`
      : "";
    description = `${formattedAmount}${descriptionText}`;
  } else if (activity.type === "shopping_item_created") {
    IconComponent = ListTodo;
    description = activity.data.itemName;
  } else {
    // shopping_item_completed
    IconComponent = Check;
    description = `${activity.data.itemName} in ${activity.data.shoppingListName}`;
  }

  return (
    <div className="flex items-start gap-3 py-2">
      <UserAvatar name={userName} image={activity.user.image} size="md" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <IconComponent className="text-muted-foreground h-4 w-4 shrink-0" />
          <p className="text-foreground line-clamp-2 flex-1 text-sm">
            {description}
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          {relativeTime} by {userName}
        </p>
      </div>
    </div>
  );
}

function RecentActivityInner({ groupId }: { groupId: number }) {
  const trpc = useTRPC();
  const { data: activityData } = useSuspenseQuery(
    trpc.group.getRecentActivity.queryOptions({
      groupId,
      limit: 10,
    }),
  );

  if (!activityData.success) {
    return handleApiError(activityData.error);
  }

  const activities = activityData.data;

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 py-4">
            <Info className="text-muted-foreground h-5 w-5" />
            <span className="text-muted-foreground text-sm">
              No recent activity
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {activities.map((activity) => (
            <ActivityItemComponent key={activity.id} activity={activity} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface RecentActivityProps {
  groupId: number;
}

export function RecentActivity({ groupId }: RecentActivityProps) {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner />
            </div>
          </CardContent>
        </Card>
      }
    >
      <RecentActivityInner groupId={groupId} />
    </Suspense>
  );
}
