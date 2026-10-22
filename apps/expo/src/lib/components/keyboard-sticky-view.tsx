import type { ReactNode } from "react";
import type { ViewInstance } from "react-native";
import type { KeyboardStickyViewProps } from "react-native-keyboard-controller";
import { useRef, useState } from "react";
import { Dimensions, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";

interface AppKeyboardStickyViewProps extends Omit<
  KeyboardStickyViewProps,
  "offset"
> {
  className?: string;
  children: ReactNode;
}

export function AppKeyboardStickyView({
  children,
  className,
  ...props
}: AppKeyboardStickyViewProps) {
  const anchor = useRef<ViewInstance>(null);
  const [coveredBelow, setCoveredBelow] = useState(0);

  return (
    <View
      ref={anchor}
      onLayout={() =>
        anchor.current?.measureInWindow((_x, y, _width, height) =>
          setCoveredBelow(
            Math.max(0, Dimensions.get("window").height - y - height),
          ),
        )
      }
    >
      <KeyboardStickyView
        // Keyboard height counts from the window bottom, but this view already sits coveredBelow above it
        offset={{ opened: coveredBelow, closed: 0 }}
        className={className}
        {...props}
      >
        {children}
      </KeyboardStickyView>
    </View>
  );
}
