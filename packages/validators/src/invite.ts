import { z } from "zod/v4";

export const INVITE_CODE_LENGTH = 8;
export const INVITE_CODE_GROUP = INVITE_CODE_LENGTH / 2;
export const INVITE_TTL_DAYS = 7;
export const INVITE_PATH = "/join";
export const INVITE_REFERRER_KEY = "invite_code";
export const DAY_MS = 86_400_000;

// Crockford base32: no I, L, O or U, so no look-alikes or accidental words
export const INVITE_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Also takes a pasted invite link. */
export const normalizeInviteCode = (raw: string) =>
  (raw.split(`${INVITE_PATH}/`).pop() ?? "")
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, INVITE_CODE_LENGTH);

export const formatInviteCode = (code: string) =>
  `${code.slice(0, INVITE_CODE_GROUP)}-${code.slice(INVITE_CODE_GROUP)}`;

export const invitePath = (code: string): `${typeof INVITE_PATH}/${string}` =>
  `${INVITE_PATH}/${code}`;

export const inviteLink = (baseUrl: string, code: string) =>
  `${baseUrl}${invitePath(code)}`;

export const inviteCodeSchema = z
  .string()
  .transform(normalizeInviteCode)
  .pipe(
    z
      .string()
      .length(INVITE_CODE_LENGTH, { message: "Invite codes have 8 characters" })
      .refine(
        (code) => [...code].every((c) => INVITE_CODE_ALPHABET.includes(c)),
        {
          message: "That isn't a valid invite code",
        },
      ),
  );

export const inviteCodeInputSchema = z.object({ code: inviteCodeSchema });

export const inviteExpiryLabel = (expiresAt: Date) => {
  const days = Math.ceil((expiresAt.getTime() - Date.now()) / DAY_MS);
  return days <= 1 ? "Expires within a day" : `Expires in ${days} days`;
};

// browsers drop tabs and newlines and read "\" as "/", so "/\t/host" and "/\host" both leave our origin
export const safeRedirectPath = (path: string | undefined) =>
  path?.startsWith("/") &&
  !path.startsWith("//") &&
  [...path].every((c) => c > " " && c !== "\\")
    ? path
    : "/";
