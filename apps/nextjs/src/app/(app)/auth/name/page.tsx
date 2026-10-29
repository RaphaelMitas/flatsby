import { redirect } from "next/navigation";

import { safeRedirectPath } from "@flatsby/validators/invite";

import { getSession } from "~/auth/server";
import NameForm from "./NameForm";

export default async function NamePage({
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
    <NameForm
      defaultName={session.user.name}
      next={safeRedirectPath(typeof next === "string" ? next : undefined)}
    />
  );
}
