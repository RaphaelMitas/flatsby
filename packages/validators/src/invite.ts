import type { Translate } from "@flatsby/i18n/message-key";
import { z } from "zod/v4";

import { msg } from "@flatsby/i18n/message-key";

import type { InvitePlaceholder } from "./group";

export const INVITE_CODE_LENGTH = 8;
export const INVITE_CODE_GROUP = INVITE_CODE_LENGTH / 2;
const INVITE_TTL_DAYS = 7;
export const INVITE_PATH = "/join";
const INVITE_REFERRER_KEY = "invite_code";
const INVITE_PLACEHOLDER_REFERRER_KEY = "invite_placeholder";
const INVITE_PLACEHOLDER_PARAM = "p";
const DAY_MS = 86_400_000;

// Crockford base32: no I, L, O or U, so no look-alikes or accidental words
export const INVITE_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Also takes a pasted invite link. */
export const normalizeInviteCode = (raw: string) =>
  (raw.split(`${INVITE_PATH}/`).pop() ?? "")
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(new RegExp(`[^${INVITE_CODE_ALPHABET}]`, "g"), "")
    .slice(0, INVITE_CODE_LENGTH);

export const formatInviteCode = (code: string) =>
  `${code.slice(0, INVITE_CODE_GROUP)}-${code.slice(INVITE_CODE_GROUP)}`;

// Read out one character at a time, not as "K7PQ minus 2M9X"
export const spokenInviteCode = (code: string) => code.split("").join(" ");

export const invitePath = (
  code: string,
  placeholderId?: number,
): `${typeof INVITE_PATH}/${string}` =>
  placeholderId === undefined
    ? `${INVITE_PATH}/${code}`
    : `${INVITE_PATH}/${code}?${INVITE_PLACEHOLDER_PARAM}=${placeholderId}`;

export const inviteLink = (
  baseUrl: string,
  code: string,
  placeholderId?: number,
) => `${baseUrl}${invitePath(code, placeholderId)}`;

/** The card's preview and the share both use this, so the creator sees exactly what goes out. */
export const inviteMessage = (
  t: Translate,
  baseUrl: string,
  code: string,
  placeholder?: InvitePlaceholder,
) => {
  const link = inviteLink(baseUrl, code, placeholder?.id);
  return placeholder === undefined
    ? t("invite.shareGroup", { link })
    : t("invite.sharePersonal", { name: placeholder.name, link });
};

const placeholderIdSchema = z.coerce.number().int().positive();

export const parsePlaceholderId = (value: unknown) =>
  placeholderIdSchema.safeParse(value).data;

export interface InviteReferrer {
  code: string;
  placeholderId: number | undefined;
}

export const inviteReferrer = ({ code, placeholderId }: InviteReferrer) => {
  const params = new URLSearchParams({ [INVITE_REFERRER_KEY]: code });
  if (placeholderId !== undefined) {
    params.set(INVITE_PLACEHOLDER_REFERRER_KEY, String(placeholderId));
  }
  return params;
};

export const readInviteReferrer = (
  params: URLSearchParams,
): InviteReferrer | null => {
  const code = inviteCodeSchema.safeParse(params.get(INVITE_REFERRER_KEY));
  return code.success
    ? {
        code: code.data,
        placeholderId: parsePlaceholderId(
          params.get(INVITE_PLACEHOLDER_REFERRER_KEY),
        ),
      }
    : null;
};

// A live code is enough to join, so analytics only ever sees the route
export const redactInvitePath = (url: string) =>
  url.replace(new RegExp(`${INVITE_PATH}/[^/?#]+`), `${INVITE_PATH}/[code]`);

export const inviteCodeSchema = z
  .string()
  .transform(normalizeInviteCode)
  .pipe(
    z
      .string()
      .length(INVITE_CODE_LENGTH, { message: msg("errors.invalidInviteCode") }),
  );

export const inviteCodeInputSchema = z.object({ code: inviteCodeSchema });

// Without a placeholder the joiner becomes a new member, which is all released apps send
export const joinInviteInputSchema = inviteCodeInputSchema.extend({
  placeholderId: z.number().optional(),
});

export const inviteSharePressedInputSchema = z.object({
  groupId: z.number(),
  personal: z.boolean(),
});

export const inviteExpiresAt = () =>
  new Date(Date.now() + INVITE_TTL_DAYS * DAY_MS);

export const outlivesAnyInvite = (since: Date) =>
  Date.now() - since.getTime() > INVITE_TTL_DAYS * DAY_MS;

export const inviteDaysLeft = (expiresAt: Date) =>
  Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / DAY_MS));

// browsers drop tabs and newlines and read "\" as "/", so "/\t/host" and "/\host" both leave our origin
export const safeRedirectPath = (path: string | undefined) =>
  path?.startsWith("/") &&
  !path.startsWith("//") &&
  [...path].every((c) => c > " " && c !== "\\")
    ? path
    : "/home";
