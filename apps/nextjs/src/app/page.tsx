import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSession, signOutAndRedirect } from "~/auth/server";
import { caller } from "~/trpc/server";
import {
  APP_STORE_ID,
  DESCRIPTION,
  TITLE,
} from "./_components/landing/content";
import { LandingPage } from "./_components/landing/LandingPage";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: "index,follow",
  alternates: {
    canonical: "/",
    types: { "text/markdown": "/index.md" },
  },
  openGraph: {
    type: "website",
    siteName: "Flatsby",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  itunes: { appId: APP_STORE_ID },
};

export default async function HomePage() {
  const session = await getSession();

  if (!session?.user) {
    const ua = (await headers()).get("user-agent") ?? "";
    const platform = /iPhone|iPad|iPod/.test(ua)
      ? "ios"
      : /Android/.test(ua)
        ? "android"
        : "other";
    return <LandingPage platform={platform} />;
  }

  const userWithGroups = await caller.user.getCurrentUserWithGroups();
  if (!userWithGroups.success) {
    return signOutAndRedirect();
  }

  if (userWithGroups.data.groups.length > 0) {
    redirect("/home");
  } else {
    redirect("/group");
  }
}
