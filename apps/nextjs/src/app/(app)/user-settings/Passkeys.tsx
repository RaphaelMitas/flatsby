"use client";

import type { Passkey } from "@better-auth/passkey/client";
import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@flatsby/ui/alert-dialog";
import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import PasskeyIcon from "@flatsby/ui/custom/icons/PasskeyIcon";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { Input } from "@flatsby/ui/input";
import { usePasskey } from "@flatsby/validators/usePasskey";

import { authClient } from "~/auth/client";
import { savePasskeyDevice } from "~/auth/passkey-device";
import { sendLoginEvent } from "../auth/login/send-login-event";

export default function Passkeys() {
  const t = useTranslations();
  const { data: passkeys } = authClient.useListPasskeys();
  const add = usePasskey({
    run: () => authClient.passkey.addPasskey(),
    onDone: () => {
      savePasskeyDevice("used");
      sendLoginEvent({
        event: "passkey_created",
        source: "settings",
        url: window.location.href,
      });
    },
  });

  return (
    <Card data-testid="settings-passkeys">
      <CardHeader>
        <CardTitle>{t("settings.passkeys.title")}</CardTitle>
        <CardDescription>{t("settings.passkeys.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {passkeys?.map((passkey) => (
          <PasskeyRow key={passkey.id} passkey={passkey} />
        ))}
        {add.error && (
          <p className="text-destructive text-sm">{t(add.error)}</p>
        )}
        <Button
          variant="outline"
          className="self-start"
          data-testid="settings-passkeys-add"
          disabled={add.busy}
          onClick={() => void add.start()}
        >
          {add.busy && <LoadingSpinner className="mr-2" />}
          {t("settings.passkeys.add")}
        </Button>
      </CardContent>
    </Card>
  );
}

function PasskeyRow({ passkey }: { passkey: Passkey }) {
  const t = useTranslations();
  const format = useFormatter();
  const name = passkey.name ?? t("settings.passkeys.unnamed");
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const change = async (
    request: () => Promise<{ error: unknown }>,
    onSuccess?: () => void,
  ) => {
    setBusy(true);
    setFailed(false);
    const { error } = await request().catch((thrown: unknown) => ({
      error: thrown,
    }));
    setBusy(false);
    if (error) setFailed(true);
    else onSuccess?.();
  };

  const rename = () => {
    const next = draft?.trim();
    if (!next) return;
    void change(
      () => authClient.passkey.updatePasskey({ id: passkey.id, name: next }),
      () => setDraft(null),
    );
  };

  return (
    <div className="flex flex-col gap-2" data-testid="settings-passkey">
      <div className="flex items-center gap-3">
        <PasskeyIcon className="text-muted-foreground h-5 w-5 shrink-0" />
        {draft === null ? (
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{name}</span>
            {passkey.createdAt && (
              <span className="text-muted-foreground text-sm">
                {t("settings.passkeys.created", {
                  date: format.dateTime(new Date(passkey.createdAt), {
                    dateStyle: "medium",
                  }),
                })}
              </span>
            )}
          </div>
        ) : (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              rename();
            }}
          >
            <Input
              autoFocus
              value={draft}
              maxLength={64}
              aria-label={t("settings.passkeys.namePlaceholder")}
              placeholder={t("settings.passkeys.namePlaceholder")}
              data-testid="settings-passkey-name-input"
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button type="submit" disabled={busy || !draft.trim()}>
              {t("settings.passkeys.save")}
            </Button>
          </form>
        )}
        {draft === null && (
          <>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              data-testid="settings-passkey-rename"
              onClick={() => setDraft(passkey.name ?? "")}
            >
              {t("settings.passkeys.rename")}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={busy}
                  data-testid="settings-passkey-remove"
                >
                  {t("settings.passkeys.remove")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("settings.passkeys.removeTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings.passkeys.removeBody", { name })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    data-testid="settings-passkey-remove-confirm"
                    onClick={() =>
                      void change(() =>
                        authClient.passkey.deletePasskey({ id: passkey.id }),
                      )
                    }
                  >
                    {t("settings.passkeys.remove")}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
      {failed && (
        <p className="text-destructive text-sm">{t("auth.passkey.failed")}</p>
      )}
    </div>
  );
}
