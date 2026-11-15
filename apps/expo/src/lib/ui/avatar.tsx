import * as React from "react";
import { Image, Text, View } from "react-native";
import { tv } from "tailwind-variants";

import { useMountEffect } from "@flatsby/validators/useMountEffect";

import { cn } from "../utils";

const avatarVariants = tv({
  base: "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
});

const avatarImageVariants = tv({
  base: "aspect-square h-full w-full",
});

const avatarFallbackVariants = tv({
  base: "flex h-full w-full items-center justify-center rounded-full bg-muted-foreground",
});

interface AvatarContextType {
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
}

const AvatarContext = React.createContext<AvatarContextType | null>(null);

interface AvatarProps {
  className?: string;
  children: React.ReactNode;
}

const Avatar = ({ className, children, ...props }: AvatarProps) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);

  const contextValue = React.useMemo(
    () => ({ imageLoaded, setImageLoaded }),
    [imageLoaded],
  );

  return (
    <AvatarContext.Provider value={contextValue}>
      <View className={avatarVariants({ className })} {...props}>
        {children}
      </View>
    </AvatarContext.Provider>
  );
};

interface AvatarImageProps {
  className?: string;
  src?: string;
  alt?: string;
}

const AvatarImage = ({ src, ...props }: AvatarImageProps) => {
  const context = React.useContext(AvatarContext);

  if (!context) {
    throw new Error("AvatarImage must be used within Avatar");
  }

  if (!src) {
    return null;
  }

  return (
    <LoadingImage
      key={src}
      src={src}
      setImageLoaded={context.setImageLoaded}
      {...props}
    />
  );
};

const LoadingImage = ({
  className,
  src,
  alt,
  setImageLoaded,
}: AvatarImageProps & Pick<AvatarContextType, "setImageLoaded">) => {
  useMountEffect(() => () => setImageLoaded(false));

  return (
    <Image
      source={{ uri: src }}
      className={avatarImageVariants({ className })}
      accessibilityLabel={alt}
      onLoad={() => setImageLoaded(true)}
      onError={() => setImageLoaded(false)}
    />
  );
};

interface AvatarFallbackProps {
  className?: string;
  textClassName?: string;
  children: React.ReactNode;
}

const AvatarFallback = ({
  className,
  textClassName,
  children,
  ...props
}: AvatarFallbackProps) => {
  const context = React.useContext(AvatarContext);

  if (!context) {
    throw new Error("AvatarFallback must be used within Avatar");
  }

  if (context.imageLoaded) {
    return null;
  }

  return (
    <View className={avatarFallbackVariants({ className })} {...props}>
      <Text className={cn("text-muted text-sm font-medium", textClassName)}>
        {children}
      </Text>
    </View>
  );
};

export { Avatar, AvatarImage, AvatarFallback };
