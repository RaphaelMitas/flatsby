"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import { Label } from "@flatsby/ui/label";
import { Switch } from "@flatsby/ui/switch";

import { useTRPC } from "~/trpc/react";

export function AnalyticsSettings() {
  const t = useTranslations("settings.analytics");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const userQuery = trpc.user.getCurrentUser;
  const { data: user } = useSuspenseQuery(userQuery.queryOptions());

  const setOptOut = useMutation(
    trpc.user.setAnalyticsOptOut.mutationOptions({
      onMutate: async ({ optOut }) => {
        await queryClient.cancelQueries(userQuery.queryFilter());
        queryClient.setQueryData(userQuery.queryKey(), (old) =>
          old ? { ...old, analyticsOptOut: optOut } : old,
        );
      },
      onSettled: () => queryClient.invalidateQueries(userQuery.queryFilter()),
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("appOnly")}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <Label htmlFor="usage-analytics" className="flex flex-col items-start">
          <span>{t("usage")}</span>
          <span className="text-muted-foreground text-sm font-normal">
            {t("usageWebBody")}
          </span>
        </Label>
        <Switch
          id="usage-analytics"
          data-testid="usage-analytics-switch"
          checked={!user.analyticsOptOut}
          onCheckedChange={(on) => setOptOut.mutate({ optOut: !on })}
        />
      </CardContent>
    </Card>
  );
}
