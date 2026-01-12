import * as React from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { tv } from "tailwind-variants";

import Icon from "./custom/icons/Icon";

const ANIMATION_DURATION = 200;

// Context for accordion state management
interface AccordionContextValue {
  value: string | string[] | undefined;
  onValueChange: (itemValue: string) => void;
  type: "single" | "multiple";
  collapsible: boolean;
  disabled: boolean;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(
  null,
);

function useAccordionContext() {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion components must be used within an Accordion");
  }
  return context;
}

// Context for individual item
interface AccordionItemContextValue {
  value: string;
  isOpen: boolean;
  disabled: boolean;
}

const AccordionItemContext =
  React.createContext<AccordionItemContextValue | null>(null);

function useAccordionItemContext() {
  const context = React.useContext(AccordionItemContext);
  if (!context) {
    throw new Error(
      "AccordionTrigger/AccordionContent must be used within an AccordionItem",
    );
  }
  return context;
}

// Variants
const accordionVariants = tv({
  base: "w-full",
});

const accordionItemVariants = tv({
  base: "w-full border-b border-border",
});

const accordionTriggerVariants = tv({
  base: "w-full flex-row items-center justify-between py-4 active:opacity-70",
  variants: {
    disabled: {
      true: "opacity-50",
    },
  },
});

// Types
interface AccordionBaseProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

interface AccordionSingleProps extends AccordionBaseProps {
  type: "single";
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string | undefined) => void;
  collapsible?: boolean;
}

interface AccordionMultipleProps extends AccordionBaseProps {
  type: "multiple";
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}

type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

// Accordion Root
const Accordion = React.forwardRef<View, AccordionProps>((props, ref) => {
  const {
    type,
    value: controlledValue,
    defaultValue,
    onValueChange,
    children,
    className,
    disabled = false,
  } = props;
  const collapsible = type === "single" ? (props.collapsible ?? false) : false;

  const [uncontrolledValue, setUncontrolledValue] = React.useState<
    string | string[] | undefined
  >(defaultValue);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (itemValue: string) => {
      if (type === "single") {
        const currentValue = !Array.isArray(value) ? value : undefined;
        const newValue =
          currentValue === itemValue
            ? collapsible
              ? undefined
              : currentValue
            : itemValue;

        if (!isControlled) {
          setUncontrolledValue(newValue);
        }
        onValueChange?.(newValue);
      } else {
        const currentValue = Array.isArray(value) ? value : [];
        const newValue = currentValue.includes(itemValue)
          ? currentValue.filter((v) => v !== itemValue)
          : [...currentValue, itemValue];

        if (!isControlled) {
          setUncontrolledValue(newValue);
        }
        onValueChange?.(newValue);
      }
    },
    [type, value, collapsible, isControlled, onValueChange],
  );

  const contextValue = React.useMemo(
    () => ({
      value,
      onValueChange: handleValueChange,
      type,
      collapsible,
      disabled,
    }),
    [value, handleValueChange, type, collapsible, disabled],
  );

  return (
    <AccordionContext.Provider value={contextValue}>
      <View ref={ref} className={accordionVariants({ className })}>
        {children}
      </View>
    </AccordionContext.Provider>
  );
});
Accordion.displayName = "Accordion";

// AccordionItem
interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const AccordionItem = React.forwardRef<View, AccordionItemProps>(
  ({ value, children, className, disabled = false, ...props }, ref) => {
    const accordionContext = useAccordionContext();

    const isOpen =
      accordionContext.type === "single"
        ? accordionContext.value === value
        : Array.isArray(accordionContext.value) &&
          accordionContext.value.includes(value);

    const itemContextValue = React.useMemo(
      () => ({
        value,
        isOpen,
        disabled: disabled || accordionContext.disabled,
      }),
      [value, isOpen, disabled, accordionContext.disabled],
    );

    return (
      <AccordionItemContext.Provider value={itemContextValue}>
        <View
          ref={ref}
          className={accordionItemVariants({ className })}
          {...props}
        >
          {children}
        </View>
      </AccordionItemContext.Provider>
    );
  },
);
AccordionItem.displayName = "AccordionItem";

// AccordionTrigger
interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
  showChevron?: boolean;
}

const AccordionTrigger = React.forwardRef<View, AccordionTriggerProps>(
  ({ children, className, showChevron = true, ...props }, ref) => {
    const accordionContext = useAccordionContext();
    const itemContext = useAccordionItemContext();

    const handlePress = () => {
      if (!itemContext.disabled) {
        accordionContext.onValueChange(itemContext.value);
      }
    };

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={itemContext.disabled}
        className={accordionTriggerVariants({
          className,
          disabled: itemContext.disabled,
        })}
        {...props}
      >
        <View className="flex-1 flex-row items-center min-w-0">{children}</View>
        {showChevron && (
          <Icon
            name={itemContext.isOpen ? "chevron-up" : "chevron-down"}
            size={16}
            color="muted-foreground"
          />
        )}
      </Pressable>
    );
  },
);
AccordionTrigger.displayName = "AccordionTrigger";

// AccordionContent with Reanimated
interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

const AccordionContent = React.forwardRef<View, AccordionContentProps>(
  ({ children, className }, ref) => {
    const itemContext = useAccordionItemContext();
    const height = useSharedValue(0);

    const derivedHeight = useDerivedValue(() =>
      withTiming(height.value * (itemContext.isOpen ? 1 : 0), {
        duration: ANIMATION_DURATION,
      }),
    );

    const animatedStyle = useAnimatedStyle(() => ({
      height: derivedHeight.value,
      overflow: "hidden" as const,
    }));

    return (
      <Animated.View ref={ref} style={animatedStyle}>
        <View
          className={`absolute top-0 left-0 right-0 ${className ?? ""}`}
          onLayout={(e) => {
            height.value = e.nativeEvent.layout.height;
          }}
        >
          {children}
        </View>
      </Animated.View>
    );
  },
);
AccordionContent.displayName = "AccordionContent";

export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  type AccordionProps,
};
