import { NextResponse } from "next/server";

import { auth } from "~/auth/server";
import { env } from "~/env";

/**
 * E2E-only route: returns the sign-in code last sent to `?email=`, since e2e
 * stacks have no mail provider.
 */
export async function GET(request: Request) {
  if (!env.E2E_TESTING) {
    return NextResponse.json(
      { error: "E2E testing is not enabled" },
      { status: 403 },
    );
  }

  const email = new URL(request.url).searchParams.get("email");
  const { otp } = email
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
