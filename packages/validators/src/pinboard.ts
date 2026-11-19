import { z } from "zod/v4";

import { msg } from "@flatsby/i18n/message-key";

export const MAX_PIN_TITLE_LENGTH = 60;
export const MAX_PIN_BODY_LENGTH = 1000;
export const MAX_PINS_PER_GROUP = 30;
export const MAX_WIFI_SSID_LENGTH = 32;
export const MAX_WIFI_PASSWORD_LENGTH = 64;

export const pinIcons = [
  "pin",
  "wifi",
  "key-round",
  "phone",
  "trash-2",
  "scroll-text",
  "washing-machine",
  "zap",
] as const;
export const pinIconSchema = z.enum(pinIcons);
export type PinIcon = z.infer<typeof pinIconSchema>;

const titleSchema = z
  .string()
  .trim()
  .min(1, { message: msg("pinboard.validation.titleRequired") })
  .max(MAX_PIN_TITLE_LENGTH, {
    message: msg("pinboard.validation.titleTooLong"),
  });

const bodySchema = z
  .string()
  .trim()
  .max(MAX_PIN_BODY_LENGTH, {
    message: msg("pinboard.validation.bodyTooLong"),
  });

const bodyRequired = {
  path: ["body"],
  message: msg("pinboard.validation.bodyRequired"),
};

export const pinWifiSchema = z.object({
  ssid: z.string().trim().min(1).max(MAX_WIFI_SSID_LENGTH),
  password: z.string().max(MAX_WIFI_PASSWORD_LENGTH),
});
export type PinWifi = z.infer<typeof pinWifiSchema>;

const wifiOf = ({
  icon,
  ssid,
  password,
}: {
  icon: PinIcon;
  ssid: string;
  password: string;
}): PinWifi | null =>
  icon === "wifi" && ssid !== "" ? { ssid, password } : null;

export const pinFormSchema = z
  .object({
    title: titleSchema,
    body: bodySchema,
    icon: pinIconSchema,
    ssid: z
      .string()
      .trim()
      .max(MAX_WIFI_SSID_LENGTH, {
        message: msg("pinboard.validation.ssidTooLong"),
      }),
    password: z.string().max(MAX_WIFI_PASSWORD_LENGTH, {
      message: msg("pinboard.validation.passwordTooLong"),
    }),
  })
  .refine((pin) => pin.body !== "" || wifiOf(pin) !== null, bodyRequired);
export type PinFormValues = z.infer<typeof pinFormSchema>;

const pinContentSchema = z.object({
  title: titleSchema,
  body: bodySchema,
  icon: pinIconSchema,
  wifi: pinWifiSchema.nullable(),
});
type PinContent = z.infer<typeof pinContentSchema>;

const hasContent = (pin: PinContent) => pin.body !== "" || pin.wifi !== null;

export const pinContentOf = ({
  ssid,
  password,
  ...pin
}: PinFormValues): PinContent => ({
  ...pin,
  wifi: wifiOf({ icon: pin.icon, ssid, password }),
});

export const pinFormOf = (pin?: Partial<PinContent>): PinFormValues => ({
  title: pin?.title ?? "",
  body: pin?.body ?? "",
  icon: pin?.icon ?? "pin",
  ssid: pin?.wifi?.ssid ?? "",
  password: pin?.wifi?.password ?? "",
});

export const pinRefSchema = z.object({
  groupId: z.number(),
  id: z.number(),
});

export const createPinSchema = pinContentSchema
  .extend({ groupId: z.number() })
  .refine(hasContent, bodyRequired);
export type CreatePinInput = z.infer<typeof createPinSchema>;

export const updatePinSchema = pinContentSchema
  .extend(pinRefSchema.shape)
  .refine(hasContent, bodyRequired);
export type UpdatePinInput = z.infer<typeof updatePinSchema>;

export const pinSchema = pinContentSchema.extend({ id: z.number() });
export type Pin = z.infer<typeof pinSchema>;

export const pinStarters = [
  { icon: "wifi", title: msg("pinboard.starters.wifi") },
  { icon: "key-round", title: msg("pinboard.starters.landlord") },
  { icon: "trash-2", title: msg("pinboard.starters.bins") },
  { icon: "scroll-text", title: msg("pinboard.starters.houseRules") },
] as const satisfies readonly { icon: PinIcon; title: string }[];

const escapeWifi = (value: string) => value.replace(/([\\;,:"])/g, "\\$1");

export const wifiQrText = ({ ssid, password }: PinWifi) =>
  password === ""
    ? `WIFI:T:nopass;S:${escapeWifi(ssid)};;`
    : `WIFI:T:WPA;S:${escapeWifi(ssid)};P:${escapeWifi(password)};;`;

export function wifiFromQrText(text: string): PinWifi | null {
  if (!/^WIFI:/i.test(text)) return null;
  const fields = new Map<string, string>();
  for (const field of text.slice(5).match(/(?:\\.|[^;\\])+/g) ?? []) {
    const colon = field.indexOf(":");
    if (colon < 1) continue;
    fields.set(
      field.slice(0, colon).toUpperCase(),
      field.slice(colon + 1).replace(/\\(.)/g, "$1"),
    );
  }
  const wifi = pinWifiSchema.safeParse({
    ssid: fields.get("S") ?? "",
    password: fields.get("P") ?? "",
  });
  return wifi.success ? wifi.data : null;
}
