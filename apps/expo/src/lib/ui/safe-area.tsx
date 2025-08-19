import type { ComponentProps } from "react";
import {
  Platform,
  SafeAreaView as RNCSafeAreaView,
  StatusBar,
} from "react-native";

export const SafeAreaView = ({
  children,
  ...props
}: ComponentProps<typeof RNCSafeAreaView>) => {
  return (
    <RNCSafeAreaView
      style={{
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
      }}
      {...props}
    >
      {children}
    </RNCSafeAreaView>
  );
};
