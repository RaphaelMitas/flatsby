import type { SwitchProps as RNSwitchProps } from "react-native";
import { Platform, Switch as RNSwitch } from "react-native";

import { useThemeColors } from "../utils";

interface SwitchProps extends Omit<RNSwitchProps, "trackColor" | "thumbColor"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = ({
  checked,
  onCheckedChange,
  disabled,
  ...props
}: SwitchProps) => {
  const { getColor } = useThemeColors();

  return (
    <RNSwitch
      // Force remount when checked changes to work around RN Switch controlled mode quirk
      key={checked ? "on" : "off"}
      value={checked}
      onValueChange={onCheckedChange}
      disabled={disabled}
      // iOS 26 always draws a white thumb, which vanishes on the dark-mode primary track
      trackColor={{
        false: getColor("input"),
        true: Platform.OS === "ios" ? undefined : getColor("primary"),
      }}
      thumbColor={Platform.OS === "ios" ? undefined : getColor("background")}
      ios_backgroundColor={getColor("input")}
      {...props}
    />
  );
};

export { Switch, type SwitchProps };
