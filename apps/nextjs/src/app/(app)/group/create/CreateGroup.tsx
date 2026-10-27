"use client";

import type { CurrencyCode } from "@flatsby/validators/expenses/types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { failureOf } from "@flatsby/api/resultMutation";
import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { Input } from "@flatsby/ui/input";
import { Label } from "@flatsby/ui/label";

import { useGroupContext } from "~/app/_components/context/group-context";
import { InviteContent } from "~/app/(app)/group/settings/InviteDialog";
import { CurrencySelect } from "~/components/CurrencySelect";
import { useTRPC } from "~/trpc/react";

export function CreateGroup() {
  const t = useTranslations();
  const [groupName, setGroupName] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");
  const [created, setCreated] = useState<{ id: number; name: string }>();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { switchGroup } = useGroupContext();

  const groupMutation = useMutation(
    trpc.group.createGroup.mutationOptions({
      onSuccess: async (data, { name }) => {
        if (!data.success) {
          return;
        }

        void queryClient.invalidateQueries(
          trpc.group.getUserGroups.queryOptions(),
        );
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUserWithGroups.queryOptions(),
        );
        // The group exists either way; failing here would invite a duplicate create
        await switchGroup(data.data.groupId).catch(() => undefined);
        setCreated({ id: data.data.groupId, name });
      },
    }),
  );
  const createFailure = failureOf(groupMutation, t("errors.unexpected"));

  if (created) {
    return (
      <div className="p-8">
        <div className="bg-muted mx-auto flex max-w-md flex-col gap-4 rounded-lg p-8 shadow-lg">
          <div className="text-center">
            <h1 className="text-2xl font-bold">
              {t("invite.title", { group: created.name })}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {t("invite.anyoneCanJoin")}
            </p>
          </div>
          <InviteContent groupId={created.id} />
          <Button
            variant="outline"
            data-testid="group-invite-done"
            onClick={() => router.push("/home")}
          >
            {t("invite.done")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="bg-muted mx-auto max-w-md rounded-lg p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold" data-testid="group-create-title">
            {t("group.create.title")}
          </h1>
          <p className="mt-2">{t("group.create.description")}</p>
        </div>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            groupMutation.mutate({ name: groupName, currency });
          }}
        >
          <div>
            <label
              className="text-muted-foreground mb-2 block text-sm font-medium"
              htmlFor="groupName"
            >
              {t("group.nameLabel")}
            </label>
            <Input
              id="groupName"
              data-testid="group-create-name-input"
              maxLength={256}
              placeholder={t("group.namePlaceholder")}
              onChange={(event) => {
                setGroupName(event.target.value);
              }}
              value={groupName}
              disabled={groupMutation.isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="group-create-currency">
              {t("group.expenseSettings.currency")}
            </Label>
            <CurrencySelect
              id="group-create-currency"
              className="w-full"
              data-testid="group-create-currency"
              value={currency}
              onChange={setCurrency}
              disabled={groupMutation.isPending}
            />
            <p className="text-muted-foreground text-sm">
              {t("group.create.currencyHint")}
            </p>
          </div>

          {createFailure && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("common.error")}</AlertTitle>
              <AlertDescription>{createFailure}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full"
            type="submit"
            data-testid="group-create-submit"
            disabled={groupMutation.isPending}
          >
            {groupMutation.isPending ? (
              <LoadingSpinner />
            ) : (
              t("navigation.createGroup")
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
