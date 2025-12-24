import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, getSession } from "~/auth/server";
import { caller } from "~/trpc/server";

export default async function HomePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const userWithGroups = await caller.user.getCurrentUserWithGroups();
  if (!userWithGroups.success) {
    await auth.api.signOut({
      headers: await headers(),
    });
    return redirect("/auth/login");
  }

  if (userWithGroups.data.user?.lastGroupUsed) {
    redirect(`/group/${userWithGroups.data.user.lastGroupUsed.id}`);
  } else {
    redirect("/group");
  }
}
