import type { SwitchProps as RNSwitchProps } from "react-native";
import * as React from "react";
import { Switch as RNSwitch } from "react-native";

import { useThemeColors } from "../utils";

interface SwitchProps extends Omit<RNSwitchProps, "trackColor" | "thumbColor"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<RNSwitch, SwitchProps>(
  ({ checked, onCheckedChange, disabled, ...props }, ref) => {
    const { getColor } = useThemeColors();

    return (
      <RNSwitch
        ref={ref}
        // Force remount when checked changes to work around RN Switch controlled mode quirk
        key={checked ? "on" : "off"}
        value={checked}
        onValueChange={onCheckedChange}
        disabled={disabled}
        trackColor={{
          false: getColor("input"),
          true: getColor("primary"),
        }}
        thumbColor={getColor("background")}
        ios_backgroundColor={getColor("input")}
        {...props}
      />
    );
  },
);

Switch.displayName = "Switch";

export { Switch, type SwitchProps };
