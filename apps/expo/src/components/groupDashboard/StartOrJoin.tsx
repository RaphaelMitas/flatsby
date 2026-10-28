import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslations } from "use-intl";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import FlatsbyCat from "~/lib/ui/custom/icons/FlatsbyCat";
import Icon from "~/lib/ui/custom/icons/Icon";
import { useThemeColors } from "~/lib/utils";
import { useSession } from "~/utils/auth/auth-client";

export function StartOrJoin() {
  const t = useTranslations("group.onboarding");
  const router = useRouter();
  const { getColor } = useThemeColors();
  const { data: session } = useSession();
  const firstName = session?.user.name.split(" ")[0] ?? "";

  return (
    <View className="flex-1 justify-between gap-4 p-6">
      <Text
        testID="onboarding-title"
        className="text-foreground mt-8 text-3xl font-extrabold tracking-tight"
      >
        {firstName ? `${t("greeting", { name: firstName })}\n` : ""}
        {t("question")}
      </Text>

      <View className="gap-3 pb-6">
        <View className="items-end pr-4">
          <View className="-mb-6">
            <FlatsbyCat size={64} color={getColor("primary")} animated />
          </View>
        </View>
        <Choice
          testID="onboarding-start"
          icon="house"
          title={t("start")}
          hint={t("startHint")}
          onPress={() => router.push("/(tabs)/home/create-group")}
        />
        <Choice
          testID="onboarding-join"
          icon="key-round"
          title={t("join")}
          hint={t("joinHint")}
          onPress={() => router.push("/join")}
        />
      </View>
    </View>
  );
}

function Choice({
  testID,
  icon,
  title,
  hint,
  onPress,
}: {
  testID: string;
  icon: IconProps["name"];
  title: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      className="border-border bg-card active:bg-muted flex-row items-center gap-3 rounded-2xl border p-4"
    >
      <View className="bg-muted size-11 items-center justify-center rounded-xl">
        <Icon name={icon} size={22} color="foreground" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-foreground text-base font-semibold">{title}</Text>
        <Text className="text-muted-foreground text-sm">{hint}</Text>
      </View>
      <Icon name="chevron-right" size={18} color="muted-foreground" />
    </Pressable>
  );
}
