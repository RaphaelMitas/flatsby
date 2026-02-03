import type { ComponentProps } from "react";
import { Platform } from "react-native";
import { useBottomTabBarHeight } from "react-native-bottom-tabs";
import { SafeAreaView as RNCSafeAreaView } from "react-native-safe-area-context";

export const SafeAreaView = ({
  children,
  edges = ["top"],
  ...props
}: Omit<ComponentProps<typeof RNCSafeAreaView>, "className">) => {
  const tabBarHeight = useBottomTabBarHeight();
  const isIphone = Platform.OS === "ios" && !Platform.isPad;
  const isIpad = Platform.OS === "ios" && Platform.isPad;

  return (
    <RNCSafeAreaView
      {...props}
      style={{
        flex: 1,
        paddingTop: isIpad ? tabBarHeight : 0,
        paddingBottom: isIphone ? tabBarHeight : 0,
      }}
      edges={edges}
    >
      {children}
    </RNCSafeAreaView>
  );
};
