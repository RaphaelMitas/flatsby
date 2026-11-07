import { useState } from "react";
import { View } from "react-native";
import { useTranslations } from "use-intl";

import {
  MAX_PLACEHOLDER_NAME_LENGTH,
  placeholderNameSchema,
} from "@flatsby/validators/group";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import { Button } from "~/lib/ui/button";
import { Input } from "~/lib/ui/input";

export function PlaceholderNameField({
  defaultName = "",
  submitLabel,
  submitIcon,
  inputTestID,
  buttonTestID,
  autoFocus,
  hideSubmitWhenEmpty,
  onChangeText,
  onSubmit,
}: {
  defaultName?: string;
  submitLabel: string;
  submitIcon?: IconProps["name"];
  inputTestID: string;
  buttonTestID: string;
  autoFocus?: boolean;
  hideSubmitWhenEmpty?: boolean;
  onChangeText?: (name: string) => void;
  onSubmit: (name: string) => void;
}) {
  const t = useTranslations();
  const [name, setName] = useState(defaultName);
  const empty = name.trim() === "";

  const change = (text: string) => {
    setName(text);
    onChangeText?.(text);
  };

  const submit = () => {
    const parsed = placeholderNameSchema.safeParse(name);
    if (!parsed.success) return;
    onSubmit(parsed.data);
    change("");
  };

  return (
    <View className="flex-row items-center gap-3">
      <Input
        testID={inputTestID}
        className="flex-1"
        placeholder={t("group.placeholders.namePlaceholder")}
        value={name}
        onChangeText={change}
        maxLength={MAX_PLACEHOLDER_NAME_LENGTH}
        autoFocus={autoFocus}
        returnKeyType="done"
        onSubmitEditing={submit}
        // Return adds the next name, and on an empty field closes the keyboard
        submitBehavior={empty ? "blurAndSubmit" : "submit"}
      />
      {!(hideSubmitWhenEmpty && empty) && (
        <Button
          testID={buttonTestID}
          title={submitLabel}
          icon={submitIcon}
          disabled={empty}
          onPress={submit}
        />
      )}
    </View>
  );
}
