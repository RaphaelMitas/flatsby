import * as React from "react";
import { Image, Text, View } from "react-native";
import { tv } from "tailwind-variants";

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
  imageError: boolean;
  setImageError: (error: boolean) => void;
}

const AvatarContext = React.createContext<AvatarContextType | null>(null);

interface AvatarProps {
  className?: string;
  children: React.ReactNode;
}

const Avatar = ({ className, children, ...props }: AvatarProps) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  const contextValue = React.useMemo(
    () => ({
      imageLoaded,
      setImageLoaded,
      imageError,
      setImageError,
    }),
    [imageLoaded, imageError],
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

const AvatarImage = ({ className, src, alt, ...props }: AvatarImageProps) => {
  const context = React.useContext(AvatarContext);

  if (!context) {
    throw new Error("AvatarImage must be used within Avatar");
  }

  const { setImageLoaded, setImageError } = context;

  React.useEffect(() => {
    // Reset states when src changes
    setImageLoaded(false);
    setImageError(false);
  }, [src, setImageLoaded, setImageError]);

  const handleLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleError = () => {
    setImageLoaded(false);
    setImageError(true);
  };

  // Handle case when no src is provided
  React.useEffect(() => {
    if (!src) {
      setImageError(true);
      setImageLoaded(false);
    }
  }, [src, setImageError, setImageLoaded]);

  // Don't render image if no src provided
  if (!src) {
    return null;
  }

  return (
    <Image
      source={{ uri: src }}
      className={avatarImageVariants({ className })}
      accessibilityLabel={alt}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
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

  const { imageLoaded, imageError } = context;

  // Only show fallback if image failed to load or there was an error
  if (imageLoaded && !imageError) {
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
