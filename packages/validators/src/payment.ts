import { z } from "zod/v4";

import { msg } from "@flatsby/i18n/message-key";

import { centsToDecimal } from "./expenses/conversion";

export const MAX_PAYPAL_HANDLE_LENGTH = 20;

const PAYPAL_HANDLE_SHAPE = new RegExp(
  `^[A-Za-z0-9]{1,${MAX_PAYPAL_HANDLE_LENGTH}}$`,
);

export function parsePaypalHandle(value: string) {
  const handle = value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/^(paypal\.me|paypal\.com\/paypalme)\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
  return handle && PAYPAL_HANDLE_SHAPE.test(handle) ? handle : null;
}

// Blank clears it
export const paypalHandleInputSchema = z.object({
  paypalHandle: z.string().transform((value, ctx) => {
    if (!value.trim()) return "";
    const handle = parsePaypalHandle(value);
    if (handle) return handle;
    ctx.addIssue({
      code: "custom",
      message: msg("settings.payment.paypalInvalid"),
    });
    return z.NEVER;
  }),
});

export const paypalMeUrl = (
  handle: string,
  amountInCents: number,
  currency: string,
) =>
  amountInCents > 0
    ? `https://paypal.me/${handle}/${centsToDecimal(amountInCents).toFixed(2)}${currency}`
    : null;

export const PAYPAL_ME_SIGNUP_URL =
  "https://www.paypal.com/digital-wallet/send-receive-money/paypal-me/";
