import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { AppLayout } from "~/app/_components/layout/app-layout";

interface ChatLayoutProps {
  children: ReactNode;
}

export default async function ChatLayout({ children }: ChatLayoutProps) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login");
  }

  return <AppLayout section="chat">{children}</AppLayout>;
}
