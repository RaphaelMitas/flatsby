import { Text, View } from "react-native";

import Icon from "~/lib/ui/custom/icons/Icon";

type ToolState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied";

interface ToolStatusBadgeProps {
  state: ToolState;
}

const statusConfig: Record<
  ToolState,
  { label: string; icon: string; colorClass: string }
> = {
  "input-streaming": {
    label: "Pending",
    icon: "circle-dot",
    colorClass: "text-muted-foreground",
  },
  "input-available": {
    label: "Running",
    icon: "clock",
    colorClass: "text-muted-foreground",
  },
  "approval-requested": {
    label: "Awaiting",
    icon: "clock",
    colorClass: "text-warning",
  },
  "approval-responded": {
    label: "Responded",
    icon: "circle-check",
    colorClass: "text-info",
  },
  "output-available": {
    label: "Done",
    icon: "circle-check",
    colorClass: "text-success",
  },
  "output-error": {
    label: "Error",
    icon: "circle-x",
    colorClass: "text-destructive",
  },
  "output-denied": {
    label: "Denied",
    icon: "circle-x",
    colorClass: "text-warning",
  },
};

export function ToolStatusBadge({ state }: ToolStatusBadgeProps) {
  const config = statusConfig[state];

  return (
    <View className="bg-secondary flex-row items-center gap-1 rounded-full px-2 py-0.5">
      <Icon
        name={
          config.icon as "circle-dot" | "clock" | "circle-check" | "circle-x"
        }
        size={12}
        color={
          state === "output-available"
            ? "success"
            : state === "output-error"
              ? "destructive"
              : state === "approval-requested" || state === "output-denied"
                ? "warning"
                : state === "approval-responded"
                  ? "info"
                  : "muted-foreground"
        }
      />
      <Text
        className={`text-xs ${
          state === "output-available"
            ? "text-success"
            : state === "output-error"
              ? "text-destructive"
              : state === "approval-requested" || state === "output-denied"
                ? "text-warning"
                : state === "approval-responded"
                  ? "text-info"
                  : "text-muted-foreground"
        }`}
      >
        {config.label}
      </Text>
    </View>
  );
}
