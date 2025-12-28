import * as React from "react";
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
}

const Card = React.forwardRef<View, CardProps>(
  ({ className, children, ...props }, ref) => (
    <View ref={ref} className={cardVariants({ className })} {...props}>
      {children}
    </View>
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<View, CardProps>(
  ({ className, children, ...props }, ref) => (
    <View ref={ref} className={cardHeaderVariants({ className })} {...props}>
      {children}
    </View>
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<Text, CardProps>(
  ({ className, children, ...props }, ref) => (
    <Text ref={ref} className={cardTitleVariants({ className })} {...props}>
      {children}
    </Text>
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<Text, CardProps>(
  ({ className, children, ...props }, ref) => (
    <Text
      ref={ref}
      className={cardDescriptionVariants({ className })}
      {...props}
    >
      {children}
    </Text>
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<View, CardProps>(
  ({ className, children, ...props }, ref) => (
    <View ref={ref} className={cardContentVariants({ className })} {...props}>
      {children}
    </View>
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<View, CardProps>(
  ({ className, children, ...props }, ref) => (
    <View ref={ref} className={cardFooterVariants({ className })} {...props}>
      {children}
    </View>
  ),
);
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
