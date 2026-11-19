"use client";

import type { Pin, PinDraft } from "@flatsby/validators/pinboard";
import { useState } from "react";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, QrCode } from "lucide-react";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";

import { isPendingId } from "@flatsby/api/resultMutation";
import { cn } from "@flatsby/ui";
import { Button, buttonVariants } from "@flatsby/ui/button";
import { Card } from "@flatsby/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@flatsby/ui/dialog";
import {
  MAX_PINS_PER_GROUP,
  pinContentOf,
  pinFormOf,
  pinStarters,
  wifiQrText,
} from "@flatsby/validators/pinboard";

import { useGroupContext } from "~/app/_components/context/group-context";
import { CopyButton } from "~/app/_components/CopyButton";
import { useTRPC } from "~/trpc/react";
import { PinDialog } from "./PinDialog";
import { PinIconBadge } from "./PinIconBadge";
import { usePinMutations } from "./usePinMutations";

export function Pinboard() {
  const t = useTranslations();
  const trpc = useTRPC();
  const { currentGroup } = useGroupContext();
  const groupId = currentGroup?.id ?? 0;
  const { data } = useSuspenseQuery(
    trpc.pinboard.list.queryOptions({ groupId }),
  );
  const [draft, setDraft] = useState<PinDraft | null>(null);
  const [draftsOpened, setDraftsOpened] = useState(0);
  const [codeFor, setCodeFor] = useState<Pin | null>(null);
  const openDraft = (opened: PinDraft) => {
    setDraft(opened);
    setDraftsOpened((count) => count + 1);
  };
  const { create, update, remove } = usePinMutations(groupId, openDraft);

  if (!data.success)
    return (
      <p className="text-muted-foreground p-4 text-center">
        {data.error.message}
      </p>
    );
  const pins = data.data;

  return (
    <div className="mx-auto flex w-full max-w-prose flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <Link
          href="/home"
          aria-label={t("navigation.home")}
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        >
          <ArrowLeft />
        </Link>
        <h1 className="flex-1 text-2xl font-extrabold tracking-tight">
          {t("pinboard.title")}
        </h1>
        {pins.length < MAX_PINS_PER_GROUP && (
          <Button
            data-testid="pinboard-add"
            onClick={() => openDraft(pinFormOf())}
          >
            <Plus />
            {t("pinboard.add")}
          </Button>
        )}
      </div>

      {pins.length === 0 ? (
        <EmptyBoard
          onStart={(starter) =>
            openDraft(
              pinFormOf({ title: t(starter.title), icon: starter.icon }),
            )
          }
        />
      ) : (
        pins.map((pin) => (
          <PinCard
            key={pin.id}
            pin={pin}
            onEdit={() => openDraft(pinFormOf(pin))}
            onShowCode={() => setCodeFor(pin)}
          />
        ))
      )}

      {draft && (
        <PinDialog
          key={draftsOpened}
          draft={draft}
          onClose={() => setDraft(null)}
          onSave={(values) => {
            const content = pinContentOf(values);
            const pin = pins.find(({ id }) => id === draft.id);
            if (pin) update.mutate({ groupId, id: pin.id, ...content });
            else create.mutate({ groupId, ...content });
            setDraft(null);
          }}
          onDelete={(id) => {
            remove.mutate({ groupId, id });
            setDraft(null);
          }}
        />
      )}

      <Dialog
        open={!!codeFor}
        onOpenChange={(open) => !open && setCodeFor(null)}
      >
        {codeFor?.wifi && (
          <DialogContent
            data-testid="pin-qr-dialog"
            className="text-center sm:max-w-xs"
          >
            <DialogHeader>
              <DialogTitle className="text-center leading-tight wrap-break-word">
                {codeFor.title}
              </DialogTitle>
              <DialogDescription className="text-center">
                {codeFor.wifi.ssid}
              </DialogDescription>
            </DialogHeader>
            <div
              data-testid="pin-qr-code"
              className="mx-auto rounded-lg bg-white p-3"
            >
              <QRCode value={wifiQrText(codeFor.wifi)} size={200} />
            </div>
            <p className="text-muted-foreground text-sm">
              {t("pinboard.qr.hint")}
            </p>
            <Button
              variant="secondary"
              data-testid="pin-qr-done"
              onClick={() => setCodeFor(null)}
            >
              {t("common.done")}
            </Button>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function PinCard({
  pin,
  onEdit,
  onShowCode,
}: {
  pin: Pin;
  onEdit: () => void;
  onShowCode: () => void;
}) {
  const copyValue = pin.wifi?.password || pin.body;

  const t = useTranslations();

  return (
    <Card
      data-testid={`pin-${pin.title}`}
      className={cn(
        "flex flex-row gap-3 rounded-2xl p-4 shadow-none",
        isPendingId(pin.id) && "opacity-60",
      )}
    >
      <PinIconBadge icon={pin.icon} />
      <div className="min-w-0 flex-1">
        <div className="flex min-h-10 items-center gap-1">
          <p className="min-w-0 flex-1 font-semibold wrap-break-word">
            {pin.title}
          </p>
          {copyValue !== "" && <CopyButton value={copyValue} />}
          <Button
            data-testid={`pin-edit-${pin.title}`}
            variant="ghost"
            size="icon-sm"
            aria-label={t("pinboard.editEntry", { title: pin.title })}
            disabled={isPendingId(pin.id)}
            onClick={onEdit}
          >
            <Pencil />
          </Button>
        </div>
        {pin.wifi && (
          <p className="text-muted-foreground wrap-break-word">
            {pin.wifi.ssid}
            {pin.wifi.password !== "" && (
              <>
                <br />
                {pin.wifi.password}
              </>
            )}
          </p>
        )}
        {pin.body !== "" && (
          <p className="text-muted-foreground wrap-break-word whitespace-pre-line">
            {pin.body}
          </p>
        )}
        {pin.wifi && (
          <Button
            data-testid={`pin-qr-${pin.title}`}
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onShowCode}
          >
            <QrCode />
            {t("pinboard.qr.open")}
          </Button>
        )}
      </div>
    </Card>
  );
}

function EmptyBoard({
  onStart,
}: {
  onStart: (starter: (typeof pinStarters)[number]) => void;
}) {
  const t = useTranslations();

  return (
    <div data-testid="pinboard-empty" className="pt-4">
      <p className="text-xl font-extrabold tracking-tight">
        {t("pinboard.empty.title")}
      </p>
      <p className="text-muted-foreground mt-1">{t("pinboard.empty.body")}</p>
      <p className="text-muted-foreground mt-8 mb-2 text-sm font-semibold">
        {t("pinboard.empty.startWith")}
      </p>
      <Card className="divide-border flex flex-col gap-0 divide-y rounded-2xl p-0 shadow-none">
        {pinStarters.map((starter) => (
          <button
            key={starter.icon}
            type="button"
            data-testid={`pinboard-starter-${starter.icon}`}
            onClick={() => onStart(starter)}
            className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 text-left first:rounded-t-2xl last:rounded-b-2xl"
          >
            <PinIconBadge icon={starter.icon} />
            <span className="flex-1 font-semibold">{t(starter.title)}</span>
            <Plus className="text-muted-foreground size-4.5" />
          </button>
        ))}
      </Card>
    </div>
  );
}
