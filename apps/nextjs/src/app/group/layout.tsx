import { redirect } from "next/navigation";

import { Navigation } from "~/app/_components/layout/navigation";
import { getSession } from "~/auth/server";

export default async function GroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login");
  }

  return <Navigation>{children}</Navigation>;
}
