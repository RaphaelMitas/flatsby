import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslations } from "use-intl";

import {
  INVITE_CODE_GROUP,
  INVITE_CODE_LENGTH,
  invitePath,
  normalizeInviteCode,
} from "@flatsby/validators/invite";

import { Button } from "~/lib/ui/button";
import { CodeInput } from "~/lib/ui/code-input";

export default function JoinGroupScreen() {
  const t = useTranslations();
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <View className="bg-background flex-1 gap-6 p-6">
      <Text className="text-muted-foreground text-center text-sm">
        {t("invite.join.enterCode", { length: INVITE_CODE_LENGTH })}
      </Text>
      <CodeInput
        testID="group-join-code-input"
        value={code}
        length={INVITE_CODE_LENGTH}
        groupSize={INVITE_CODE_GROUP}
        onChangeText={(text) => setCode(normalizeInviteCode(text))}
        autoFocus
        autoCapitalize="characters"
      />
      <Text className="text-muted-foreground text-center text-xs">
        {t("invite.join.lookAlikes")}
      </Text>
      <Button
        testID="group-join-code-submit"
        title={t("invite.join.continue")}
        disabled={code.length !== INVITE_CODE_LENGTH}
        onPress={() => router.replace(invitePath(code))}
      />
    </View>
  );
}
