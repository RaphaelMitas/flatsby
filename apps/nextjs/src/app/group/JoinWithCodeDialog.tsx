"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@flatsby/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@flatsby/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@flatsby/ui/input-otp";
import {
  INVITE_CODE_LENGTH,
  INVITE_PATH,
  normalizeInviteCode,
} from "@flatsby/validators/invite";

const HALF = INVITE_CODE_LENGTH / 2;

export function JoinWithCodeDialog() {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="group-join-with-code-button">
          Join with code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Join a group</DialogTitle>
          <DialogDescription>Enter the 8-character code.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col items-center gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`${INVITE_PATH}/${code}`);
          }}
        >
          <InputOTP
            data-testid="group-join-code-input"
            autoFocus
            maxLength={INVITE_CODE_LENGTH}
            value={code}
            onChange={(value) => setCode(normalizeInviteCode(value))}
            pasteTransformer={normalizeInviteCode}
          >
            <InputOTPGroup>
              {Array.from({ length: HALF }, (_, i) => (
                <InputOTPSlot key={i} index={i} className="font-mono" />
              ))}
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              {Array.from({ length: HALF }, (_, i) => (
                <InputOTPSlot key={i} index={HALF + i} className="font-mono" />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <Button
            type="submit"
            className="w-full"
            disabled={code.length !== INVITE_CODE_LENGTH}
          >
            Continue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
