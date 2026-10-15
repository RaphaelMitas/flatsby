import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession, signOutAndRedirect } from "~/auth/server";
import { caller } from "~/trpc/server";
import { DESCRIPTION, TITLE } from "./_components/landing/content";
import { LandingPage } from "./_components/landing/LandingPage";
import { marketingMetadata } from "./_components/landing/metadata";
import { getPlatform } from "./_components/landing/platform";

export const metadata: Metadata = marketingMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/",
  markdownPath: "/index.md",
});

export default async function HomePage() {
  const session = await getSession();

  if (!session?.user) {
    return <LandingPage platform={await getPlatform()} />;
  }

  const userWithGroups = await caller.user.getCurrentUserWithGroups();
  if (!userWithGroups.success) {
    if (userWithGroups.error.type === "UnauthorizedError") {
      return signOutAndRedirect();
    }
    throw new Error(userWithGroups.error.message);
  }

  if (userWithGroups.data.groups.length > 0) {
    redirect("/home");
  } else {
    redirect("/group");
  }
}
