import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSession, signOutAndRedirect } from "~/auth/server";
import { caller } from "~/trpc/server";
import { LandingPage } from "./_components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Flatsby - Household Management Made Simple",
  description:
    "Share shopping lists, split expenses, and stay organized with your flatmates.",
  robots: "index,follow",
};

export default async function HomePage() {
  const session = await getSession();

  if (!session?.user) {
    const ua = (await headers()).get("user-agent") ?? "";
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    return <LandingPage isIOS={isIOS} />;
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
