import type { Metadata } from "next";

import { inviteCodeSchema, invitePath } from "@flatsby/validators/invite";

import { APP_STORE_ID } from "~/app/_components/landing/content";
import { getPlatform } from "~/app/_components/landing/platform";
import { getSession } from "~/auth/server";
import { caller } from "~/trpc/server";
import { JoinInvite } from "./JoinInvite";

export const metadata: Metadata = {
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

  if (preview?.success === false && preview.error.type !== "NotFoundError") {
    throw new Error(preview.error.message);
  }

  return (
    <main className="bg-muted flex h-dvh overflow-y-auto p-4">
      {/* generateMetadata would stream this into <body>; React hoists it into <head> from here */}
      {parsed.success && (
        <meta
          name="apple-itunes-app"
          content={`app-id=${APP_STORE_ID}, app-argument=flatsby:/${invitePath(parsed.data)}`}
        />
      )}
      <div className="m-auto flex w-full justify-center">
        <JoinInvite
          code={parsed.data ?? ""}
          preview={preview?.success ? preview.data : null}
          signedIn={!!session?.user}
          platform={platform}
        />
      </div>
    </main>
  );
}
