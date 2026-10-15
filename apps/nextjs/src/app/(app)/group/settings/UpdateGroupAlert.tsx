"use client";

import { AlertCircle, CircleCheckBig } from "lucide-react";
import { useTranslations } from "next-intl";

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
  if (mutation.isError || mutation.data?.success === false) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>
          {mutation.data?.success === false
            ? mutation.data.error.type
            : (mutation.error?.data?.code ?? t("common.unknownError"))}
        </AlertTitle>
        <AlertDescription>
          {mutation.data?.success === false
            ? mutation.data.error.message
            : (mutation.error?.message ??
              t("group.expenseSettings.saveFailed"))}
        </AlertDescription>
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
