import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRef } from "react";
import { View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import type { Choice } from "./ChoiceButtons";
import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import { ChoiceButtons } from "./ChoiceButtons";
import { SettingsItem } from "./SettingsItem";

export function SettingsChoiceItem<T extends string>(props: {
  title: string;
  value: string;
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
          <ChoiceButtons
            choices={props.choices}
            selected={props.selected}
            buttonClassName="flex-1 py-0"
            // Spans the container's p-2 (7pt) so the target fills the row
            hitSlop={{ top: 7, bottom: 7 }}
            onSelect={(value) => {
              props.onSelect(value);
              swipeableRef.current?.close();
            }}
          />
        </View>
      )}
    >
      <SettingsItem
        title={props.title}
        value={props.value}
        iconName={props.iconName}
        onPress={() => swipeableRef.current?.openRight()}
      />
    </ReanimatedSwipeable>
  );
}
