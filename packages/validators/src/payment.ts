import { z } from "zod/v4";

import { msg } from "@flatsby/i18n/message-key";

export const MAX_PAYPAL_HANDLE_LENGTH = 20;

const PAYPAL_HANDLE_SHAPE = /^[A-Za-z0-9]{1,20}$/;

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

export const memberPaypalHandleInputSchema = z.object({
  groupId: z.number(),
  groupMemberId: z.number(),
});

// null clears it
export const updatePaypalHandleInputSchema = z.object({
  paypalHandle: z
    .string()
    .transform((value) => parsePaypalHandle(value) ?? "")
    .refine((handle) => handle.length > 0, {
      message: msg("settings.payment.paypalInvalid"),
    })
    .nullable(),
});

export const paypalHandleFormSchema = z.object({
  paypalHandle: z
    .string()
    .refine((value) => !value.trim() || parsePaypalHandle(value) !== null, {
      message: msg("settings.payment.paypalInvalid"),
    }),
});

export const paypalMeUrl = (
  handle: string,
  amountInCents: number,
  currency: string,
) =>
  amountInCents > 0
    ? `https://paypal.me/${handle}/${(amountInCents / 100).toFixed(2)}${currency}`
    : null;

export const PAYPAL_ME_SIGNUP_URL = "https://www.paypal.com/paypalme/";
