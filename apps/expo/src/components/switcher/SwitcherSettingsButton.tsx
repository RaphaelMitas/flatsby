import { Pressable } from "react-native";

import Icon from "~/lib/ui/custom/icons/Icon";

export function SwitcherSettingsButton({
  testID,
  label,
  onPress,
}: {
  testID: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="border-border bg-card active:bg-muted aspect-square items-center justify-center rounded-2xl border shadow-sm"
    >
      <Icon name="settings" size={20} color="foreground" />
    </Pressable>
  );
}
