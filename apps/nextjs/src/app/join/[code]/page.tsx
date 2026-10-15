import type { Metadata } from "next";

import { INVITE_PATH, inviteCodeSchema } from "@flatsby/validators/invite";

import { getSession } from "~/auth/server";
import { caller } from "~/trpc/server";
import { APP_STORE_ID } from "../../_components/landing/content";
import { getPlatform } from "../../_components/landing/platform";
import { JoinInvite } from "./JoinInvite";

export const metadata: Metadata = {
  title: "Join a group on Flatsby",
  robots: { index: false },
  itunes: null,
};

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const parsed = inviteCodeSchema.safeParse((await params).code);
  const [session, preview, platform] = await Promise.all([
    getSession(),
    parsed.success ? caller.invite.preview({ code: parsed.data }) : null,
    getPlatform(),
  ]);

  return (
    <main className="bg-muted flex min-h-dvh items-center justify-center p-4">
      {/* generateMetadata would stream this into <body>; React hoists it into <head> from here */}
      {parsed.success && (
        <meta
          name="apple-itunes-app"
          content={`app-id=${APP_STORE_ID}, app-argument=flatsby:/${INVITE_PATH}/${parsed.data}`}
        />
      )}
      <JoinInvite
        code={parsed.data ?? ""}
        preview={preview?.success ? preview.data : null}
        signedIn={!!session?.user}
        platform={platform}
      />
    </main>
  );
}
