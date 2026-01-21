import { redirect } from "next/navigation";

import { AppLayout } from "~/app/_components/layout/app-layout";
import { getSession } from "~/auth/server";
import { caller } from "~/trpc/server";

export default async function ExpensesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const userWithGroups = await caller.user.getCurrentUserWithGroups();
  if (!userWithGroups.success || !userWithGroups.data.user?.lastGroupUsed) {
    redirect("/group");
  }

  return <AppLayout>{children}</AppLayout>;
}
