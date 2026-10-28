import { useState } from "react";
import { View } from "react-native";

import {
  MAX_PLACEHOLDER_NAME_LENGTH,
  placeholderNameSchema,
} from "@flatsby/validators/group";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import { Button } from "~/lib/ui/button";
import { Input } from "~/lib/ui/input";

export function PlaceholderNameField({
  defaultName = "",
  placeholder,
  submitLabel,
  submitIcon,
  inputTestID,
  buttonTestID,
  autoFocus,
  onSubmit,
}: {
  defaultName?: string;
  placeholder?: string;
  submitLabel: string;
  submitIcon?: IconProps["name"];
  inputTestID: string;
  buttonTestID: string;
  autoFocus?: boolean;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(defaultName);

  const submit = () => {
    const parsed = placeholderNameSchema.safeParse(name);
    if (!parsed.success) return;
    onSubmit(parsed.data);
    setName("");
  };

  return (
    <View className="flex-row items-center gap-3">
      <Input
        testID={inputTestID}
        className="flex-1"
        placeholder={placeholder}
        value={name}
        onChangeText={setName}
        maxLength={MAX_PLACEHOLDER_NAME_LENGTH}
        autoFocus={autoFocus}
        returnKeyType="done"
        onSubmitEditing={submit}
        submitBehavior="submit"
      />
      <Button
        testID={buttonTestID}
        title={submitLabel}
        icon={submitIcon}
        disabled={name.trim() === ""}
        onPress={submit}
      />
    </View>
  );
}
