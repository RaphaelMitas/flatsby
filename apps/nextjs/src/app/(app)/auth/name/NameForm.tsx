"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { translateIfKey } from "@flatsby/i18n/message-key";
import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { Input } from "@flatsby/ui/input";
import { userNameSchema } from "@flatsby/validators/user";

import { useTRPC } from "~/trpc/react";

export default function NameForm({
  defaultName,
  next,
}: {
  defaultName: string;
  next: string;
}) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);

  const updateName = useMutation(
    trpc.user.updateUserName.mutationOptions({
      onSuccess: (result) => {
        if (!result.success) {
          setError(translateIfKey(t, result.error.message));
          return;
        }
        router.replace(next);
      },
      onError: (err) => setError(err.message),
    }),
  );

  return (
    <div className="bg-background flex h-screen w-full items-center justify-center">
      <form
        className="bg-muted flex w-96 flex-col gap-4 rounded-lg p-8"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = userNameSchema.safeParse(name.trim());
          if (!parsed.success) {
            setError(translateIfKey(t, parsed.error.issues[0]?.message ?? ""));
            return;
          }
          updateName.mutate({ name: parsed.data });
        }}
      >
        <h1 className="text-xl font-semibold">{t("auth.name.title")}</h1>
        <Input
          autoFocus
          name="name"
          autoComplete="name"
          aria-label={t("auth.name.placeholder")}
          aria-invalid={error !== null}
          placeholder={t("auth.name.placeholder")}
          className="bg-background"
          data-testid="auth-name-input"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
        />
        {error && (
          <p className="text-destructive text-sm" data-testid="auth-name-error">
            {error}
          </p>
        )}
        <p className="text-muted-foreground text-sm">{t("auth.name.hint")}</p>
        <Button
          type="submit"
          data-testid="auth-name-continue"
          disabled={updateName.isPending}
        >
          {updateName.isPending && <LoadingSpinner className="mr-2" />}
          {t("auth.name.continue")}
        </Button>
      </form>
    </div>
  );
}
