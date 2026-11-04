import { Text, View } from "react-native";

import Icon from "~/lib/ui/custom/icons/Icon";

export function ErrorMessage({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-2 p-4">
      <Icon name="circle-alert" size={24} color="muted-foreground" />
      <Text className="text-muted-foreground text-center">{message}</Text>
    </View>
  );
}
