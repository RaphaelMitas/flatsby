import type { ReactNode } from "react";
import type { PressableProps } from "react-native";
import { Pressable } from "react-native";

import Icon from "~/lib/ui/custom/icons/Icon";

interface FabProps extends PressableProps {
  accessibilityLabel: string;
  children?: ReactNode;
}

export function Fab({ children, ...props }: FabProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className="bg-primary absolute right-4 bottom-4 h-14 w-14 items-center justify-center rounded-2xl shadow-lg active:opacity-90"
      {...props}
    >
      {children ?? <Icon name="plus" size={26} color="primary-foreground" />}
    </Pressable>
  );
}
