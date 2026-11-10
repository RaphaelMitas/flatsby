import { AppLayout } from "~/app/_components/layout/app-layout";
import { getCurrentGroupId } from "~/trpc/server";

export default async function HomeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await getCurrentGroupId();

  return <AppLayout>{children}</AppLayout>;
}
