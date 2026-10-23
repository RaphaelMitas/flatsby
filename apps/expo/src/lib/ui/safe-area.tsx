import type { ComponentProps, ReactNode } from "react";
import type { Edge } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { SafeAreaView as RNCSafeAreaView } from "react-native-safe-area-context";

import { useThemeColors } from "~/lib/utils";

// The folded iPhone Duo has its status bar on the side and a top inset of 0
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
        // iOS floats the tab bar over the content. NativeTabs gives each screen its
        // own SafeAreaProvider, so the bottom inset already covers it. Android's tab
        // bar takes layout space instead, so padding there would double up.
        bottom: Platform.OS === "ios" || has("bottom") ? "additive" : "off",
        left: has("left") ? "additive" : "off",
        right: has("right") ? "additive" : "off",
      }}
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
