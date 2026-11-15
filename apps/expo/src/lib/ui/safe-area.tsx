import type { ComponentProps, ReactNode } from "react";
import type { Edge } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { SafeAreaView as RNCSafeAreaView } from "react-native-safe-area-context";

import { useThemeColors } from "~/lib/utils";

const MIN_TOP_PADDING = 20;

export const SafeAreaView = ({
  children,
  edges = ["top"],
  ...props
}: Omit<ComponentProps<typeof RNCSafeAreaView>, "className" | "edges"> & {
  edges?: Edge[];
}) => {
  const has = (edge: Edge) => edges.includes(edge);

  return (
    <RNCSafeAreaView
      {...props}
      style={{ flex: 1, paddingTop: has("top") ? MIN_TOP_PADDING : 0 }}
      edges={{
        top: has("top") ? "maximum" : "off",
        bottom: Platform.OS === "ios" || has("bottom") ? "additive" : "off",
        left: has("left") ? "additive" : "off",
        right: has("right") ? "additive" : "off",
      }}
    >
      {children}
    </RNCSafeAreaView>
  );
};

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
