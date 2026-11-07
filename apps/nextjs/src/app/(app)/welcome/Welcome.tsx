"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { failureOf } from "@flatsby/api/resultMutation";
import { translateIfKey } from "@flatsby/i18n/message-key";
import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { Input } from "@flatsby/ui/input";
import { Label } from "@flatsby/ui/label";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import {
  newGroupFormSchema,
  splitFlatmateNames,
} from "@flatsby/validators/group";

import { useCreateGroup } from "~/app/(app)/group/create/useCreateGroup";
import { JoinWithCodeDialog } from "~/app/(app)/group/JoinWithCodeDialog";
import { useTRPC } from "~/trpc/react";

const CURRENCY = "EUR";

export function Welcome({
  initialName,
  savedName,
}: {
  initialName: string;
  savedName: string;
}) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  const [editedGroupName, setEditedGroupName] = useState<string>();
  const [flatmates, setFlatmates] = useState("");
  const [issues, setIssues] = useState<
    { path: PropertyKey[]; message: string }[]
  >([]);
  const [joinOpen, setJoinOpen] = useState(false);

  const firstName = name.trim().split(/\s+/)[0] ?? "";
  const groupName =
    editedGroupName ??
    (firstName
      ? t("group.onboarding.defaultGroupName", { name: firstName })
      : "");
  const names = splitFlatmateNames(flatmates);

  const updateName = useMutation(
    trpc.user.updateUserName.mutationOptions({
      onSuccess: (result) => {
        if (!result.success) return;
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUser.queryOptions(),
        );
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUserWithGroups.queryOptions(),
        );
      },
    }),
  );
  const updateLastUsed = useMutation(
    trpc.shoppingList.updateLastUsed.mutationOptions(),
  );

  // Home should open with the invite card complete, so the button stays busy until both are cached
  const createGroup = useCreateGroup(async (groupId) => {
    await Promise.allSettled([
      updateLastUsed.mutateAsync({ groupId, shoppingListId: null }),
      queryClient.ensureQueryData(
        trpc.group.getGroup.queryOptions({ id: groupId }),
      ),
      queryClient.ensureQueryData(trpc.invite.get.queryOptions({ groupId })),
    ]);
    router.push("/home");
  });

  const saveName = async (trimmed: string) =>
    trimmed === savedName ||
    (await updateName.mutateAsync({ name: trimmed }).catch(() => undefined))
      ?.success === true;

  const submit = async () => {
    const parsed = newGroupFormSchema.safeParse({
      name: name.trim(),
      groupName: groupName.trim(),
      placeholders: names,
    });
    setIssues(parsed.error?.issues ?? []);
    if (!parsed.success) return;
    if (!(await saveName(parsed.data.name))) return;
    createGroup.mutate({
      name: parsed.data.groupName,
      currency: CURRENCY,
      placeholders: parsed.data.placeholders,
    });
  };

  // Someone who lost their invite link joins from here, so this is their name step too
  const joinWithCode = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== savedName) void saveName(trimmed);
    setJoinOpen(true);
  };

  const busy = updateName.isPending || createGroup.isPending;
  const issueFor = (field: string) => {
    const message = issues.find(({ path }) => path[0] === field)?.message;
    return message && translateIfKey(t, message);
  };
  const failure =
    failureOf(updateName, t("errors.unexpected")) ??
    failureOf(createGroup, t("errors.unexpected"));

  return (
    <main className="bg-background flex min-h-dvh w-full items-center justify-center p-4">
      <form
        className="bg-muted flex w-full max-w-md flex-col gap-5 rounded-lg p-8"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-col gap-1">
          <h1
            className="text-3xl font-extrabold tracking-tight"
            data-testid="onboarding-title"
          >
            {t("group.onboarding.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("group.onboarding.question")}
          </p>
        </div>

        <Field
          id="onboarding-name"
          label={t("group.onboarding.nameLabel")}
          error={issueFor("name")}
        >
          <Input
            id="onboarding-name"
            data-testid="onboarding-name-input"
            className="bg-background"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("auth.name.placeholder")}
            autoFocus={initialName === ""}
            autoComplete="name"
            disabled={busy}
            aria-invalid={issueFor("name") !== undefined}
          />
        </Field>

        <Field
          id="onboarding-group"
          label={t("group.onboarding.groupLabel")}
          error={issueFor("groupName")}
        >
          <Input
            id="onboarding-group"
            data-testid="onboarding-group-input"
            className="bg-background"
            value={groupName}
            onChange={(event) => setEditedGroupName(event.target.value)}
            placeholder={t("group.create.namePlaceholder")}
            disabled={busy}
            aria-invalid={issueFor("groupName") !== undefined}
          />
        </Field>

        <Field
          id="onboarding-flatmates"
          label={t("group.onboarding.flatmatesLabel")}
          error={issueFor("placeholders")}
        >
          <Input
            id="onboarding-flatmates"
            data-testid="onboarding-flatmates-input"
            className="bg-background"
            value={flatmates}
            onChange={(event) => setFlatmates(event.target.value)}
            placeholder={t("group.onboarding.flatmatesPlaceholder")}
            autoCapitalize="words"
            disabled={busy}
            aria-invalid={issueFor("placeholders") !== undefined}
          />
          {names.length > 0 && (
            <>
              <ul className="flex flex-wrap gap-2">
                {names.map((flatmate) => (
                  <li
                    key={flatmate}
                    className="bg-background flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm"
                  >
                    <UserAvatar name={flatmate} placeholder size="sm" />
                    {flatmate}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-sm">
                {t("group.onboarding.flatmatesHint")}
              </p>
            </>
          )}
        </Field>

        <p className="text-muted-foreground text-sm">
          {t("group.onboarding.currency", { currency: CURRENCY })}
        </p>

        {failure && <p className="text-destructive text-sm">{failure}</p>}

        <div className="flex flex-col gap-2">
          <Button type="submit" data-testid="onboarding-create" disabled={busy}>
            {busy && <LoadingSpinner className="mr-2" />}
            {busy
              ? t("group.onboarding.creating")
              : t("group.onboarding.create")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            data-testid="onboarding-join"
            disabled={busy}
            onClick={joinWithCode}
          >
            {t("invite.join.withCode")}
          </Button>
        </div>
      </form>
      <JoinWithCodeDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </main>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error !== undefined && (
        <p className="text-destructive text-sm">{error}</p>
      )}
    </div>
  );
}
