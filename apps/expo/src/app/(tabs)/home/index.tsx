import { useEffect } from "react";
import { Text, View } from "react-native";
import { useTranslations } from "use-intl";

import { isUnauthorizedError } from "@flatsby/api/trpcFailure";

import { Home } from "~/components/home/Home";
import { Button } from "~/lib/ui/button";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { authClient, signOut } from "~/utils/auth/auth-client";

export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  const t = useTranslations("home");
  const isUnauthorized = isUnauthorizedError(error);

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

  if (!session) {
    return null;
  }

  return (
    <SafeAreaView>
      <Home />
    </SafeAreaView>
  );
}
