import { useLocalSearchParams, useRouter } from "expo-router";

import { InviteScreen } from "~/components/invite/InviteScreen";

export default function HomeInviteRoute() {
  const router = useRouter();
  const { created } = useLocalSearchParams<{ created?: string }>();
  return (
    <InviteScreen
      withPlaceholders={created === "1"}
      onDone={() => router.back()}
    />
  );
}
