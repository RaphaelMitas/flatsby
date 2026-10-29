import { NextResponse } from "next/server";

import { auth } from "~/auth/server";
import { env } from "~/env";
import { E2E_EMAIL_DOMAIN } from "../email-domain";

// e2e stacks have no mail provider, so tests read the code here
export async function GET(request: Request) {
  if (!env.E2E_TESTING) {
    return NextResponse.json(
      { error: "E2E testing is not enabled" },
      { status: 403 },
    );
  }

  const email = new URL(request.url).searchParams.get("email");
  const { otp } = email?.endsWith(`@${E2E_EMAIL_DOMAIN}`)
    ? await auth.api.getVerificationOTP({ query: { email, type: "sign-in" } })
    : { otp: null };
  if (!otp) {
    return NextResponse.json(
      { error: "No code for this email" },
      { status: 404 },
    );
  }
  return NextResponse.json({ code: otp });
}
