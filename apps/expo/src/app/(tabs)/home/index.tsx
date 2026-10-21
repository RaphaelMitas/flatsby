import { useEffect } from "react";
import { Text, View } from "react-native";
import { TRPCClientError } from "@trpc/client";
import { usePostHog } from "posthog-react-native";
import { useTranslations } from "use-intl";

import { Dashboard } from "~/components/dashboard/Dashboard";
import { NewHome } from "~/components/home/NewHome";
import { Button } from "~/lib/ui/button";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { authClient, signOut } from "~/utils/auth/auth-client";
import { useHomeVersion } from "~/utils/home-version";

export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  const t = useTranslations("home");
  const data: unknown = error instanceof TRPCClientError ? error.data : null;
  const isUnauthorized =
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    data.code === "UNAUTHORIZED";

  useEffect(() => {
    if (isUnauthorized) {
      void signOut();
    }
  }, [isUnauthorized]);

  if (isUnauthorized) {
    return null;
  }

  return (
    <SafeAreaView>
      <View className="flex-1 items-center justify-center gap-4 p-8">
        <Text className="text-foreground text-center text-lg font-semibold">
          {t("somethingWentWrong")}
        </Text>
        <Text className="text-muted-foreground text-center text-sm">
          {error.message}
        </Text>
        <Button
          title={t("retry")}
          onPress={retry}
          variant="primary"
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

export default function Index() {
  const { data: session } = authClient.useSession();
  const { version } = useHomeVersion();
  const posthog = usePostHog();

  useEffect(() => {
    if (version) void posthog.register({ home_version: version });
  }, [posthog, version]);

  // The tab layout owns the redirect to login.
  if (!session || !version) {
    return null;
  }

  return (
    <SafeAreaView>
      {version === "new" ? <NewHome /> : <Dashboard />}
    </SafeAreaView>
  );
}
