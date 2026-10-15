import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import {
  INVITE_CODE_LENGTH,
  invitePath,
  normalizeInviteCode,
} from "@flatsby/validators/invite";

import { Button } from "~/lib/ui/button";

export default function JoinGroupScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const slots = Array.from({ length: INVITE_CODE_LENGTH }, (_, i) => code[i]);

  return (
    <View className="bg-background flex-1 gap-6 p-6">
      <Text className="text-muted-foreground text-center text-sm">
        Enter the 8-character code
      </Text>
      <View className="relative flex-row items-center justify-center gap-1">
        {slots.map((char, i) => (
          <View key={i} className="flex-row items-center gap-1">
            {i === INVITE_CODE_LENGTH / 2 && (
              <Text className="text-muted-foreground font-bold">–</Text>
            )}
            <View
              className={`h-12 w-9 items-center justify-center rounded-lg border ${
                i === code.length ? "border-foreground" : "border-border"
              } ${char ? "bg-muted" : ""}`}
            >
              <Text className="text-foreground font-mono text-xl font-bold">
                {char}
              </Text>
            </View>
          </View>
        ))}
        <TextInput
          testID="group-join-code-input"
          value={code}
          onChangeText={(text) => setCode(normalizeInviteCode(text))}
          autoFocus
          autoCapitalize="characters"
          autoCorrect={false}
          caretHidden
          className="absolute inset-0 opacity-0"
        />
      </View>
      <Text className="text-muted-foreground text-center text-xs">
        O and 0, I and 1 are treated the same
      </Text>
      <Button
        testID="group-join-code-submit"
        title="Continue"
        disabled={code.length !== INVITE_CODE_LENGTH}
        onPress={() => router.replace(invitePath(code))}
      />
    </View>
  );
}
