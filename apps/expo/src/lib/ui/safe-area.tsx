import type { ComponentProps, ReactNode } from "react";
import { Platform } from "react-native";
import {
  SafeAreaView as RNCSafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useThemeColors } from "~/lib/utils";

export const SafeAreaView = ({
  children,
  edges = ["top"],
  ...props
}: Omit<ComponentProps<typeof RNCSafeAreaView>, "className">) => {
  // iOS floats the tab bar over the content. NativeTabs gives each screen its
  // own SafeAreaProvider, so the bottom inset already covers it. Android's tab
  // bar takes layout space instead, so padding there would double up.
  const insets = useSafeAreaInsets();

  return (
    <RNCSafeAreaView
      {...props}
      style={{
        flex: 1,
        paddingBottom: Platform.OS === "ios" ? insets.bottom : 0,
      }}
      edges={edges}
    >
      {children}
    </RNCSafeAreaView>
  );
};

// Wraps a tab's whole Stack so every pushed screen clears side insets: the
// iPhone Duo's vertical status bar and tab rail, Android landscape nav bars.
export const TabSafeArea = ({ children }: { children: ReactNode }) => {
  const { getColor } = useThemeColors();

  return (
    <RNCSafeAreaView
      edges={["left", "right"]}
      style={{ flex: 1, backgroundColor: getColor("background") }}
    >
      {children}
    </RNCSafeAreaView>
  );
};
