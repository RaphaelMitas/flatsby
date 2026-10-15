import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRef } from "react";
import { View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import { Button } from "~/lib/ui/button";
import { SettingsItem } from "./SettingsItem";

interface Choice<T extends string> {
  value: T;
  label: string;
  icon?: IconProps["name"];
}

export function SettingsChoiceItem<T extends string>(props: {
  title: string;
  subtitle: string;
  iconName: IconProps["name"];
  choices: Choice<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  const swipeableRef = useRef<SwipeableMethods>(null);

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      leftThreshold={40}
      rightThreshold={40}
      renderRightActions={() => (
        <View className="h-full w-full flex-row gap-2 p-2">
          {props.choices.map((choice) => (
            <Button
              key={choice.value}
              title={choice.label}
              icon={choice.icon}
              className="flex-1"
              variant={props.selected === choice.value ? "primary" : "outline"}
              onPress={() => {
                props.onSelect(choice.value);
                swipeableRef.current?.close();
              }}
            />
          ))}
        </View>
      )}
    >
      <SettingsItem
        title={props.title}
        subtitle={props.subtitle}
        iconName={props.iconName}
        onPress={() => swipeableRef.current?.openRight()}
      />
    </ReanimatedSwipeable>
  );
}
