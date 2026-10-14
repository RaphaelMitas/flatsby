"use client";

import { AlertCircle, CircleCheckBig } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";

import type { useUpdateGroup } from "~/hooks/use-update-group";

export function UpdateGroupAlert({
  mutation,
  successTitle,
}: {
  mutation: ReturnType<typeof useUpdateGroup>;
  successTitle: string;
}) {
  if (mutation.isError || mutation.data?.success === false) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>
          {mutation.data?.success === false
            ? mutation.data.error.type
            : (mutation.error?.data?.code ?? "Unknown error")}
        </AlertTitle>
        <AlertDescription>
          {mutation.data?.success === false
            ? mutation.data.error.message
            : (mutation.error?.message ?? "unknown error while saving")}
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
