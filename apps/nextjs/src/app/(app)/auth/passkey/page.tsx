import { redirect } from "next/navigation";

import { safeRedirectPath } from "@flatsby/validators/invite";

import { getSession } from "~/auth/server";
import PasskeyOffer from "./PasskeyOffer";

export default async function PasskeyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login");
  }
  return (
    <PasskeyOffer
      next={safeRedirectPath(typeof next === "string" ? next : undefined)}
    />
  );
}
