import { redirect } from "next/navigation";

import { AppLayout } from "~/app/_components/layout/app-layout";
import { getSession } from "~/auth/server";
import { getCurrentGroupId } from "~/trpc/server";

export default async function ExpensesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login");
  }

  await getCurrentGroupId();

  return <AppLayout>{children}</AppLayout>;
}
