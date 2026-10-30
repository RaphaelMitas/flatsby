import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { invitePath } from "@flatsby/validators/invite";
import { APP_STORE_ID } from "@flatsby/validators/store";

import { platformFor } from "~/app/_components/landing/platform";
import { getSession } from "~/auth/server";
import { JoinInvite } from "./JoinInvite";
import { loadInvite } from "./loadInvite";

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({
  params,
}: JoinPageProps): Promise<Metadata> {
  const [{ code, preview }, t] = await Promise.all([
    loadInvite((await params).code),
    getTranslations(),
  ]);
  const title = preview
    ? t("invite.join.cardTitle", {
        name: preview.invitedBy,
        group: preview.groupName,
      })
    : t("invite.join.expiredTitle");
  const description = preview
    ? t("invite.join.cardDescription", {
        members: t("group.memberCount", { count: preview.memberCount }),
      })
    : t("invite.join.expiredHint");

  return {
    title,
    description,
    robots: { index: false },
    itunes: null,
    openGraph: {
      title,
      description,
      url: code ? invitePath(code) : undefined,
      siteName: "Flatsby",
      type: "website",
    },
  };
}

export default async function JoinPage({ params }: JoinPageProps) {
  const [session, { code, preview }, platform] = await Promise.all([
    getSession(),
    params.then((p) => loadInvite(p.code)),
    headers().then(platformFor),
  ]);

  return (
    <main className="bg-muted flex h-dvh overflow-y-auto p-4">
      {/* generateMetadata would stream this into <body>; React hoists it into <head> from here */}
      {code && (
        <meta
          name="apple-itunes-app"
          content={`app-id=${APP_STORE_ID}, app-argument=flatsby:/${invitePath(code)}`}
        />
      )}
      <div className="m-auto flex w-full justify-center">
        <JoinInvite
          code={code ?? ""}
          preview={preview}
          signedIn={!!session?.user}
          platform={platform}
        />
      </div>
    </main>
  );
}
