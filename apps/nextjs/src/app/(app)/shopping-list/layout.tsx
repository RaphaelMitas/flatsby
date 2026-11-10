import type { ReactNode } from "react";

import { AppLayout } from "~/app/_components/layout/app-layout";
import { getCurrentGroupId } from "~/trpc/server";

interface ShoppingListLayoutProps {
  children: ReactNode;
}

export default async function ShoppingListLayout({
  children,
}: ShoppingListLayoutProps) {
  await getCurrentGroupId();

  return <AppLayout>{children}</AppLayout>;
}
