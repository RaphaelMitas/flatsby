import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppLayout } from "~/app/_components/layout/app-layout";
import { getSession } from "~/auth/server";

interface ChatLayoutProps {
  children: ReactNode;
}

export default async function ChatLayout({ children }: ChatLayoutProps) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login");
  }

  return <AppLayout>{children}</AppLayout>;
}
