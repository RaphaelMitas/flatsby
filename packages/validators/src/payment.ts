import { z } from "zod/v4";

import { msg } from "@flatsby/i18n/message-key";

// EPC069-12 limits for the beneficiary name and the IBAN
export const MAX_ACCOUNT_HOLDER_LENGTH = 70;
export const MAX_IBAN_LENGTH = 34;
export const MAX_PAYPAL_HANDLE_LENGTH = 20;
const MAX_REFERENCE_LENGTH = 70;
// EPC069-12 caps the whole payload and the amount
const MAX_GIROCODE_BYTES = 331;
const MAX_GIROCODE_CENTS = 99_999_999_999;

const IBAN_SHAPE = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;
const PAYPAL_HANDLE_SHAPE = /^[A-Za-z0-9]{1,20}$/;
const CONTROL_CHARACTERS = /\p{Cc}/u;

// EPC069-12 keeps the BIC mandatory for SEPA members outside the EEA, and we never ask for one
const EEA_COUNTRIES = new Set([
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
]);

const normalizeIban = (value: string) =>
  value.replace(/\s+/g, "").toUpperCase();

export const formatIban = (iban: string) =>
  normalizeIban(iban).replace(/(.{4})(?=.)/g, "$1 ");

export function isValidIban(iban: string) {
  if (!IBAN_SHAPE.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = char >= "A" ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of digits) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

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

const isValidAccountHolder = (value: string) =>
  value.trim().length > 0 &&
  value.trim().length <= MAX_ACCOUNT_HOLDER_LENGTH &&
  !CONTROL_CHARACTERS.test(value);

const accountHolderSchema = z
  .string()
  .trim()
  .refine(isValidAccountHolder, {
    message: msg("settings.payment.accountHolderInvalid"),
  });

export const ibanSchema = z
  .string()
  .transform(normalizeIban)
  .refine(isValidIban, { message: msg("settings.payment.ibanInvalid") });

const paypalHandleSchema = z
  .string()
  .transform((value) => parsePaypalHandle(value) ?? "")
  .refine((handle) => handle.length > 0, {
    message: msg("settings.payment.paypalInvalid"),
  });

export const paymentDetailsSchema = z.object({
  accountHolder: z.string().nullable(),
  iban: z.string().nullable(),
  paypalHandle: z.string().nullable(),
});
type PaymentDetails = z.infer<typeof paymentDetailsSchema>;

export const memberPaymentDetailsInputSchema = z.object({
  groupId: z.number(),
  groupMemberId: z.number(),
});
export type MemberPaymentDetailsInput = z.infer<
  typeof memberPaymentDetailsInputSchema
>;

// Missing keeps what's stored, null clears it
export const updatePaymentDetailsInputSchema = z.object({
  accountHolder: accountHolderSchema.nullish(),
  iban: ibanSchema.nullish(),
  paypalHandle: paypalHandleSchema.nullish(),
});

export const paymentDetailsFormSchema = z
  .object({
    accountHolder: z.string(),
    iban: z.string(),
    paypalHandle: z.string(),
  })
  .refine(({ iban }) => !iban.trim() || isValidIban(normalizeIban(iban)), {
    path: ["iban"],
    message: msg("settings.payment.ibanInvalid"),
  })
  .refine(
    ({ accountHolder, iban }) =>
      !iban.trim() || isValidAccountHolder(accountHolder),
    {
      path: ["accountHolder"],
      message: msg("settings.payment.accountHolderInvalid"),
    },
  )
  .refine(
    ({ paypalHandle }) =>
      !paypalHandle.trim() || parsePaypalHandle(paypalHandle) !== null,
    {
      path: ["paypalHandle"],
      message: msg("settings.payment.paypalInvalid"),
    },
  );
export type PaymentDetailsFormValues = z.infer<typeof paymentDetailsFormSchema>;

export const paymentDetailsFormValues = (
  details: PaymentDetails | null,
  fallbackHolder: string,
): PaymentDetailsFormValues => ({
  accountHolder: details?.accountHolder ?? fallbackHolder,
  iban: details?.iban ? formatIban(details.iban) : "",
  paypalHandle: details?.paypalHandle ?? "",
});

// Only what was edited, so a form showing stale data can't clear a newer save
export const paymentDetailsInput = (
  values: PaymentDetailsFormValues,
  dirty: Partial<Record<keyof PaymentDetailsFormValues, boolean>>,
) => {
  const iban = values.iban.trim() || null;
  const accountHolder = values.accountHolder.trim();
  return {
    ...(dirty.iban && { iban, accountHolder: iban ? accountHolder : null }),
    ...(dirty.accountHolder &&
      !dirty.iban &&
      accountHolder && { accountHolder }),
    ...(dirty.paypalHandle && {
      paypalHandle: values.paypalHandle.trim() || null,
    }),
  };
};

const amountOf = (amountInCents: number) => (amountInCents / 100).toFixed(2);

// Banks only have to accept the SEPA basic Latin set in the reference
function sepaText(value: string) {
  return value
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/([aouAOU])\u0308/g, "$1e")
    .replace(/[^A-Za-z0-9/?:().,'+\- ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const settlementReference = (groupName: string) =>
  // i18n-ignore: payment reference on the receiver's bank statement
  sepaText(`Flatsby ${groupName}`).slice(0, MAX_REFERENCE_LENGTH).trim();

// A SEPA transfer and its GiroCode only carry euro
export function paymentOptions(
  details: PaymentDetails | null | undefined,
  currency: string,
) {
  const { accountHolder, iban, paypalHandle } = details ?? {};
  const isEuro = currency === "EUR";
  const bank =
    isEuro && iban && accountHolder
      ? { iban, accountHolder, girocode: EEA_COUNTRIES.has(iban.slice(0, 2)) }
      : null;
  return {
    bank,
    paypalHandle: paypalHandle ?? null,
    payable: !!bank || !!paypalHandle,
    euroOnly: !isEuro && !!iban,
  };
}

export type PaymentOptions = ReturnType<typeof paymentOptions>;

type SettlePaymentView =
  | { kind: "ownCode"; girocode: string }
  | { kind: "addYours" }
  | { kind: "hidden" }
  | { kind: "unavailable" }
  | { kind: "pay"; reference: string; girocode: string | null };

export function settlePaymentView(
  options: PaymentOptions,
  {
    amountInCents,
    groupName,
    receiverIsMe,
  }: { amountInCents: number; groupName: string; receiverIsMe: boolean },
): SettlePaymentView {
  const reference = settlementReference(groupName);
  const girocode = options.bank?.girocode
    ? girocodePayload({ ...options.bank, amountInCents, reference })
    : null;
  if (receiverIsMe) {
    if (girocode) return { kind: "ownCode", girocode };
    return options.payable || options.euroOnly
      ? { kind: "hidden" }
      : { kind: "addYours" };
  }
  return options.payable
    ? { kind: "pay", reference, girocode }
    : { kind: "unavailable" };
}

export function girocodePayload({
  accountHolder,
  iban,
  amountInCents,
  reference,
}: {
  accountHolder: string;
  iban: string;
  amountInCents: number;
  reference: string;
}) {
  if (amountInCents < 1 || amountInCents > MAX_GIROCODE_CENTS) return null;
  const fields = [
    "BCD",
    "002",
    "1",
    "SCT",
    "",
    accountHolder,
    iban,
    `EUR${amountOf(amountInCents)}`,
    "",
    "",
  ].join("\n");
  // The reference is ASCII, so it can be cut to the bytes the name leaves over
  const room = MAX_GIROCODE_BYTES - new TextEncoder().encode(fields).length - 1;
  return room > 0 ? `${fields}\n${reference.slice(0, room).trim()}` : null;
}

export const paypalMeUrl = (
  handle: string,
  amountInCents: number,
  currency: string,
) => `https://paypal.me/${handle}/${amountOf(amountInCents)}${currency}`;

export const PAYPAL_ME_SIGNUP_URL = "https://www.paypal.com/paypalme/";
