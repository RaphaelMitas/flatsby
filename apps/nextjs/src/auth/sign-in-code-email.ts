import "server-only";

import type { SignInCode } from "@flatsby/auth";
import { Resend } from "resend";

import { captureError } from "@flatsby/api/posthog";
import { localeFromHeaders } from "@flatsby/i18n/locale";
import { translatorFor } from "@flatsby/i18n/translator";
import { SIGN_IN_CODE_TTL_MINUTES } from "@flatsby/validators/login";

import { env } from "~/env";
import { SignInCodeEmail } from "./SignInCodeEmail";

// i18n-ignore: sender address, not copy
const FROM = "Flatsby <login@mail.flatsby.com>";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendSignInCode({ email, code, headers }: SignInCode) {
  if (!resend) {
    // e2e runs a production build without Resend and reads the code from the database
    if (env.NODE_ENV === "production" && !env.E2E_TESTING) {
      throw new Error("RESEND_API_KEY is not set");
    }
    console.info(`Sign-in code for ${email}: ${code}`);
    return;
  }

  const locale = localeFromHeaders(headers ?? new Headers());
  const t = translatorFor(locale);
  const heading = t("auth.signInCodeEmail.heading");
  const intro = t("auth.signInCodeEmail.intro");
  const expiry = t("auth.signInCodeEmail.expiry", {
    minutes: SIGN_IN_CODE_TTL_MINUTES,
  });
  const ignore = t("auth.signInCodeEmail.ignore");

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: t("auth.signInCodeEmail.subject", { code }),
    text: [heading, intro, code, expiry, ignore].join("\n\n"),
    react: SignInCodeEmail({ locale, code, heading, intro, expiry, ignore }),
  });
  if (error) {
    const failure = new Error(`Resend ${error.name}: ${error.message}`);
    captureError({ error: failure, operation: "auth.sendSignInCode" });
    throw failure;
  }
}
