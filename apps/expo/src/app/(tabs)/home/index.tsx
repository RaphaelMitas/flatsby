import { Redirect } from "expo-router";

import { Dashboard } from "~/components/dashboard/Dashboard";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { authClient } from "~/utils/auth/auth-client";

export default function Index() {
  const { data: session } = authClient.useSession();

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <SafeAreaView>
      <Dashboard />
    </SafeAreaView>
  );
}
