import type * as React from "react";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

const cardVariants = tv({
  base: "rounded-lg border border-border bg-card shadow-sm",
});

const cardHeaderVariants = tv({
  base: "flex flex-col space-y-1.5 p-6",
});

const cardTitleVariants = tv({
  base: "text-foreground font-semibold leading-none tracking-tight",
});

const cardDescriptionVariants = tv({
  base: "text-sm text-muted-foreground",
});

const cardContentVariants = tv({
  base: "p-6 pt-0",
});

const cardFooterVariants = tv({
  base: "flex items-center p-6 pt-0",
});

interface CardProps {
  className?: string;
  children: React.ReactNode;
  testID?: string;
}

const Card = ({ className, children, ...props }: CardProps) => (
  <View className={cardVariants({ className })} {...props}>
    {children}
  </View>
);

const CardHeader = ({ className, children, ...props }: CardProps) => (
  <View className={cardHeaderVariants({ className })} {...props}>
    {children}
  </View>
);

const CardTitle = ({ className, children, ...props }: CardProps) => (
  <Text className={cardTitleVariants({ className })} {...props}>
    {children}
  </Text>
);

const CardDescription = ({ className, children, ...props }: CardProps) => (
  <Text className={cardDescriptionVariants({ className })} {...props}>
    {children}
  </Text>
);

const CardContent = ({ className, children, ...props }: CardProps) => (
  <View className={cardContentVariants({ className })} {...props}>
    {children}
  </View>
);

const CardFooter = ({ className, children, ...props }: CardProps) => (
  <View className={cardFooterVariants({ className })} {...props}>
    {children}
  </View>
);

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
