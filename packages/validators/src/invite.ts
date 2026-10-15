import { z } from "zod/v4";

export const INVITE_CODE_LENGTH = 8;
export const INVITE_TTL_DAYS = 7;
export const INVITE_PATH = "/join";
export const INVITE_REFERRER_KEY = "invite_code";

// Crockford base32: no I, L, O or U, so nothing reads as another character
export const INVITE_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Accepts a typed code in any case, with or without the dash, or a pasted invite link. */
export const normalizeInviteCode = (raw: string) =>
  (raw.split(`${INVITE_PATH}/`).pop() ?? "")
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, INVITE_CODE_LENGTH);

export const formatInviteCode = (code: string) =>
  `${code.slice(0, 4)}-${code.slice(4)}`;

export const inviteLink = (baseUrl: string, code: string) =>
  `${baseUrl}${INVITE_PATH}/${code}`;

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

export const groupInviteInputSchema = z.object({ groupId: z.number() });

export const inviteExpiryLabel = (expiresAt: Date) => {
  const days = Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000);
  return days <= 1 ? "Expires within a day" : `Expires in ${days} days`;
};

// browsers treat "//host" and "/\host" as other origins
export const safeRedirectPath = (path: string | undefined) =>
  path && /^\/(?![/\\])/.test(path) ? path : "/";
