import type { ComponentProps } from "react";
import { Platform } from "react-native";
import {
  SafeAreaView as RNCSafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

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
