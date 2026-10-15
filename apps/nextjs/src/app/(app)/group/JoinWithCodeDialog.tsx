"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@flatsby/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@flatsby/ui/input-otp";
import {
  INVITE_CODE_GROUP,
  INVITE_CODE_LENGTH,
  invitePath,
  normalizeInviteCode,
} from "@flatsby/validators/invite";

export function JoinWithCodeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("invite.join.title")}</DialogTitle>
          <DialogDescription>
            {t("invite.join.enterCode", { length: INVITE_CODE_LENGTH })}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col items-center gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(invitePath(code));
          }}
        >
          <InputOTP
            data-testid="group-join-code-input"
            autoFocus
            maxLength={INVITE_CODE_LENGTH}
            value={code}
            onChange={(value) => setCode(normalizeInviteCode(value))}
            pasteTransformer={normalizeInviteCode}
            inputMode="text"
            autoCapitalize="characters"
          >
            {[0, INVITE_CODE_GROUP].map((offset) => (
              <Fragment key={offset}>
                {offset > 0 && <InputOTPSeparator />}
                <InputOTPGroup>
                  {Array.from({ length: INVITE_CODE_GROUP }, (_, i) => (
                    <InputOTPSlot
                      key={i}
                      index={offset + i}
                      className="font-mono"
                    />
                  ))}
                </InputOTPGroup>
              </Fragment>
            ))}
          </InputOTP>
          <p className="text-muted-foreground text-xs">
            {t("invite.join.lookAlikes")}
          </p>
          <Button
            type="submit"
            className="w-full"
            disabled={code.length !== INVITE_CODE_LENGTH}
          >
            {t("invite.join.continue")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
