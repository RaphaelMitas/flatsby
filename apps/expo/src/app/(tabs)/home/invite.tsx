import { useRouter } from "expo-router";

import { InviteScreen } from "~/components/invite/InviteScreen";

export default function HomeInviteRoute() {
  const router = useRouter();
  return <InviteScreen onDone={() => router.back()} />;
}
