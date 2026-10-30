"use client";

import type { Passkey } from "@better-auth/passkey/client";
import { useFormatter, useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@flatsby/ui/alert-dialog";
import { Button, buttonVariants } from "@flatsby/ui/button";
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
import {
  PASSKEY_NAME_MAX_LENGTH,
  usePasskeyRow,
} from "@flatsby/validators/usePasskey";

import { authClient } from "~/auth/client";
import { useAddPasskey } from "~/auth/passkey-device";

export default function Passkeys() {
  const t = useTranslations();
  const { data: passkeys } = authClient.useListPasskeys();
  const add = useAddPasskey("settings");

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
  const row = usePasskeyRow({
    rename: (next) =>
      authClient.passkey.updatePasskey({ id: passkey.id, name: next }),
    remove: () => authClient.passkey.deletePasskey({ id: passkey.id }),
  });

  return (
    <div className="flex flex-col gap-2" data-testid="settings-passkey">
      <div className="flex items-center gap-3">
        <PasskeyIcon className="text-muted-foreground h-5 w-5 shrink-0" />
        {row.draft === null ? (
          <>
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
            <Button
              variant="ghost"
              size="sm"
              disabled={row.busy}
              data-testid="settings-passkey-rename"
              onClick={() => row.setDraft(passkey.name ?? "")}
            >
              {t("settings.passkeys.rename")}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={row.busy}
                  data-testid="settings-passkey-remove"
                >
                  {t("common.remove")}
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
                  <AlertDialogAction
                    className={buttonVariants({ variant: "destructive" })}
                    data-testid="settings-passkey-remove-confirm"
                    onClick={row.remove}
                  >
                    {t("common.remove")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              row.saveName();
            }}
          >
            <Input
              autoFocus
              value={row.draft}
              maxLength={PASSKEY_NAME_MAX_LENGTH}
              aria-label={t("settings.passkeys.namePlaceholder")}
              placeholder={t("settings.passkeys.namePlaceholder")}
              data-testid="settings-passkey-name-input"
              onChange={(event) => row.setDraft(event.target.value)}
            />
            <Button type="submit" disabled={row.busy || !row.draft.trim()}>
              {t("common.save")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => row.setDraft(null)}
            >
              {t("common.cancel")}
            </Button>
          </form>
        )}
      </div>
      {row.failed && (
        <p className="text-destructive text-sm">{t("auth.passkey.failed")}</p>
      )}
    </div>
  );
}
