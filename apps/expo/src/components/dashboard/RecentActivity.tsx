import type { ActivityItem } from "@flatsby/validators/group";
import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

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
  const userInitials = userName.substring(0, 2).toUpperCase();
  const relativeTime = formatRelativeTime(activity.timestamp);

  let iconName: IconProps["name"];
  let description: string;

  if (activity.type === "expense") {
    iconName = "wallet";
    const formattedAmount = formatCurrencyFromCents({
      cents: activity.data.amountInCents,
      currency: activity.data.currency,
    });
    const descriptionText = activity.data.description
      ? ` - ${activity.data.description}`
      : "";
    description = `${formattedAmount}${descriptionText}`;
  } else if (activity.type === "shopping_item_created") {
    iconName = "list-todo";
    description = activity.data.itemName;
  } else {
    // shopping_item_completed
    iconName = "circle-check";
    description = `${activity.data.itemName} in ${activity.data.shoppingListName}`;
  }

  return (
    <View className="flex-row items-start gap-3 py-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src={activity.user.image ?? undefined} />
        <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
      </Avatar>
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Icon name={iconName} size={16} color="muted-foreground" />
          <Text className="text-foreground flex-1 text-sm" numberOfLines={2}>
            {description}
          </Text>
        </View>
        <Text className="text-muted-foreground text-xs">
          {relativeTime} by {userName}
        </Text>
      </View>
    </View>
  );
}

function RecentActivityInner({ selectedGroupId }: { selectedGroupId: number }) {
  const router = useRouter();
  const { data: activityData } = useSuspenseQuery(
    trpc.group.getRecentActivity.queryOptions({
      groupId: selectedGroupId,
      limit: 10,
    }),
  );

  if (!activityData.success) {
    return handleApiError({ router, error: activityData.error });
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
          <View className="flex-row items-center gap-3 py-4">
            <Icon name="info" size={20} color="muted-foreground" />
            <Text className="text-muted-foreground text-sm">
              No recent activity
            </Text>
          </View>
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
        <View className="gap-2">
          {activities.map((activity) => (
            <ActivityItemComponent key={activity.id} activity={activity} />
          ))}
        </View>
      </CardContent>
    </Card>
  );
}

export function RecentActivity() {
  const { selectedGroupId } = useShoppingStore();

  if (!selectedGroupId) {
    return null;
  }

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
            <View className="flex-row items-center justify-center py-4">
              <ActivityIndicator size="small" />
            </View>
          </CardContent>
        </Card>
      }
    >
      <RecentActivityInner selectedGroupId={selectedGroupId} />
    </Suspense>
  );
}
