import "server-only";

import type { SignInCode } from "@flatsby/auth";
import { Resend } from "resend";

import { captureError } from "@flatsby/api/posthog";
import { localeFromHeaders } from "@flatsby/i18n/locale";
import { translatorFor } from "@flatsby/i18n/translator";

import { env } from "~/env";

// i18n-ignore: sender address, not copy
const FROM = "Flatsby <login@mail.flatsby.com>";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendSignInCode({ email, code, headers }: SignInCode) {
  if (!resend) {
    // e2e reads the code from the database instead
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
  const expiry = t("auth.signInCodeEmail.expiry");
  const ignore = t("auth.signInCodeEmail.ignore");

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: t("auth.signInCodeEmail.subject", { code }),
    text: [heading, intro, code, expiry, ignore].join("\n\n"),
    html: `<!doctype html>
<html lang="${locale}">
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#09090b">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
<h1 style="font-size:20px;margin:0 0 16px">${heading}</h1>
<p style="font-size:15px;line-height:1.5;margin:0 0 16px">${intro}</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:0 0 16px;font-family:ui-monospace,Menlo,monospace">${code}</p>
<p style="font-size:15px;line-height:1.5;margin:0 0 16px">${expiry}</p>
<p style="font-size:13px;line-height:1.5;margin:0;color:#71717a">${ignore}</p>
</div>
</body>
</html>`,
  });
  if (error) {
    const failure = new Error(`Resend ${error.name}: ${error.message}`);
    captureError({ error: failure, operation: "auth.sendSignInCode" });
    throw failure;
  }
}
