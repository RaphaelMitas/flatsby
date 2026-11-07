import { redirect } from "next/navigation";

import { AppLayout } from "~/app/_components/layout/app-layout";
import { getSession } from "~/auth/server";
import { getCurrentUserWithGroups, noGroups } from "~/trpc/server";

export default async function GroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login");
  }
  // Here, not in the page: the page streams in after this layout's app shell, which would flash first
  if (noGroups(await getCurrentUserWithGroups())) redirect("/welcome");

  return <AppLayout>{children}</AppLayout>;
}
