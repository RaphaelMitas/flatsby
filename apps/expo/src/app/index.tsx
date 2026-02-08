import { Redirect } from "expo-router";

import { useSession } from "~/utils/auth/auth-client";

export default function RootIndex() {
  const { data: session } = useSession();

  if (session) {
    return <Redirect href="/(tabs)/home" />;
  }
  return <Redirect href="/auth/login" />;
}
