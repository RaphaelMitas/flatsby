import type { ComponentProps } from "react";
import { SafeAreaView as RNCSafeAreaView, StatusBar } from "react-native";

export const SafeAreaView = ({
  children,
  ...props
}: Omit<ComponentProps<typeof RNCSafeAreaView>, "className">) => {
  return (
    <RNCSafeAreaView
      style={{ flex: 1, paddingTop: StatusBar.currentHeight ?? 0 }}
      {...props}
    >
      {children}
    </RNCSafeAreaView>
  );
};
