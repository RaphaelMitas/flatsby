import { AppLayout } from "~/app/_components/layout/app-layout";

export default function UserSettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppLayout>{children}</AppLayout>;
}
