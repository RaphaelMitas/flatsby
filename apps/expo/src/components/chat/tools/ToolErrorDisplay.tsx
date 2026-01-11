import { Text, View } from "react-native";

import Icon from "~/lib/ui/custom/icons/Icon";

interface ToolErrorDisplayProps {
  error: string;
}

export function ToolErrorDisplay({ error }: ToolErrorDisplayProps) {
  return (
    <View className="flex-row items-center gap-2">
      <Icon name="circle-alert" size={16} color="destructive" />
      <Text className="text-destructive text-sm">{error}</Text>
    </View>
  );
}
