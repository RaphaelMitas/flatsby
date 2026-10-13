import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppLayout } from "~/app/_components/layout/app-layout";
import { getSession } from "~/auth/server";
import { getCurrentGroupId } from "~/trpc/server";

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

  await getCurrentGroupId();

  return <AppLayout>{children}</AppLayout>;
}
