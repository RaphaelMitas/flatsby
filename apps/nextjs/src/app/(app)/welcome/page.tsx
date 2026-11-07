import { redirect } from "next/navigation";

import { typedName } from "@flatsby/validators/user";

import { getSession } from "~/auth/server";
import { getCurrentUserWithGroups } from "~/trpc/server";
import { Welcome } from "./Welcome";

export default async function WelcomePage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/login");
  // Back from Home, or a stale group list, must not offer a second group
  const current = await getCurrentUserWithGroups();
  if (current.success && current.data.groups.length > 0) redirect("/home");
  return (
    <Welcome
      initialName={typedName(session.user)}
      savedName={session.user.name}
    />
  );
}
