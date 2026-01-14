import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { AppLayout } from "~/app/_components/layout/app-layout";

export default async function BillingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login");
  }
  return <AppLayout>{children}</AppLayout>;
}
