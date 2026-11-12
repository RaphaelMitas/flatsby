import type { ButtonProps } from "~/lib/ui/button";
import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import { Button } from "~/lib/ui/button";

export interface Choice<T extends string> {
  value: T;
  label: string;
  icon?: IconProps["name"];
}

export function ChoiceButtons<T extends string>(props: {
  choices: Choice<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
  buttonClassName?: string;
  hitSlop?: ButtonProps["hitSlop"];
}) {
  return props.choices.map((choice) => (
    <Button
      key={choice.value}
      title={choice.label}
      icon={choice.icon}
      numberOfLines={1}
      className={props.buttonClassName ?? "flex-1"}
      hitSlop={props.hitSlop}
      variant={props.selected === choice.value ? "primary" : "outline"}
      onPress={() => props.onSelect(choice.value)}
    />
  ));
}
