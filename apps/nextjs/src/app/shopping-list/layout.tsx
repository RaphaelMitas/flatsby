import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppLayout } from "~/app/_components/layout/app-layout";
import { getSession } from "~/auth/server";
import { getCurrentUserWithGroups } from "~/trpc/server";

interface ShoppingListLayoutProps {
  children: ReactNode;
}

export default async function ShoppingListLayout({
  children,
}: ShoppingListLayoutProps) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login");
  }

  // Check if user has a group selected
  const userWithGroups = await getCurrentUserWithGroups();
  if (!userWithGroups.success || !userWithGroups.data.user?.lastGroupUsed) {
    redirect("/group");
  }

  return <AppLayout>{children}</AppLayout>;
}
