import { redirect } from "next/navigation";

import { AppLayout } from "~/app/_components/layout/app-layout";
import { getCurrentUserWithGroups, noGroups } from "~/trpc/server";

export default async function GroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (noGroups(await getCurrentUserWithGroups())) redirect("/welcome");

  return <AppLayout>{children}</AppLayout>;
}
