import { View } from "react-native";
import { Redirect } from "expo-router";

import { useSession } from "~/utils/auth/auth-client";

export default function RootIndex() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <View className="bg-background flex-1" />;
  }
  if (session) {
    return <Redirect href="/(tabs)/home" />;
  }
  return <Redirect href="/auth/login" />;
}
