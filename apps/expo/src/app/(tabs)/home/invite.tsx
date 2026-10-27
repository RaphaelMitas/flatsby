import { useRouter } from "expo-router";

import { InviteScreen } from "~/components/invite/InviteScreen";

export default function HomeInvite() {
  const router = useRouter();
  return <InviteScreen onDone={() => router.back()} />;
}
