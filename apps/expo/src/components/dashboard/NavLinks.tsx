import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Card, CardContent } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";

interface NavLinkItemProps {
  href: string;
  iconName: IconProps["name"];
  label: string;
}

function NavLinkItem({ href, iconName, label }: NavLinkItemProps) {
  const router = useRouter();

  return (
    <Pressable onPress={() => router.push(href as never)}>
      <Card>
        <CardContent className="flex-row items-center justify-between p-4">
          <View className="flex-row items-center gap-3">
            <Icon name={iconName} size={20} color="muted-foreground" />
            <Text className="text-foreground font-medium">{label}</Text>
          </View>
          <Icon name="chevron-right" size={20} color="muted-foreground" />
        </CardContent>
      </Card>
    </Pressable>
  );
}

export function NavLinks() {
  return (
    <View className="gap-4">
      <NavLinkItem
        href="/(tabs)/home/shopping-lists"
        iconName="shopping-cart"
        label="Shopping lists"
      />
      <NavLinkItem
        href="/(tabs)/expenses"
        iconName="wallet"
        label="Expenses"
      />
    </View>
  );
}
