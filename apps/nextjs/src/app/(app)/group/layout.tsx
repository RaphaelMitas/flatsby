import { redirect } from "next/navigation";

import { AppLayout } from "~/app/_components/layout/app-layout";
import { getCurrentUserWithGroups, noGroups } from "~/trpc/server";

export default async function GroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Here, not in the page: the page streams in after this layout's app shell, which would flash first
  if (noGroups(await getCurrentUserWithGroups())) redirect("/welcome");

  return <AppLayout>{children}</AppLayout>;
}
