"use client";

import { AlertCircle, CircleCheckBig } from "lucide-react";
import { useTranslations } from "next-intl";

import { failureOf } from "@flatsby/api/resultMutation";
import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";

import type { useUpdateGroup } from "~/hooks/use-update-group";

export function UpdateGroupAlert({
  mutation,
  successTitle,
}: {
  mutation: ReturnType<typeof useUpdateGroup>;
  successTitle: string;
}) {
  const t = useTranslations();
  const failure = failureOf(mutation, t("group.expenseSettings.saveFailed"));
  if (failure !== undefined) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("common.error")}</AlertTitle>
        <AlertDescription>{failure}</AlertDescription>
      </Alert>
    );
  }
  if (mutation.isSuccess) {
    return (
      <Alert variant="success">
        <CircleCheckBig className="h-4 w-4" />
        <AlertTitle>{successTitle}</AlertTitle>
      </Alert>
    );
  }
  return null;
}
