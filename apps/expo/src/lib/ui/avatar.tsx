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

const Avatar = React.forwardRef<View, AvatarProps>(
  ({ className, children, ...props }, ref) => {
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
        <View ref={ref} className={avatarVariants({ className })} {...props}>
          {children}
        </View>
      </AvatarContext.Provider>
    );
  },
);
Avatar.displayName = "Avatar";

interface AvatarImageProps {
  className?: string;
  src?: string;
  alt?: string;
}

const AvatarImage = React.forwardRef<Image, AvatarImageProps>(
  ({ className, src, alt, ...props }, ref) => {
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
        ref={ref}
        source={{ uri: src }}
        className={avatarImageVariants({ className })}
        accessibilityLabel={alt}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    );
  },
);
AvatarImage.displayName = "AvatarImage";

interface AvatarFallbackProps {
  className?: string;
  textClassName?: string;
  children: React.ReactNode;
}

const AvatarFallback = React.forwardRef<View, AvatarFallbackProps>(
  ({ className, textClassName, children, ...props }, ref) => {
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
      <View
        ref={ref}
        className={avatarFallbackVariants({ className })}
        {...props}
      >
        <Text className={cn("text-sm font-medium text-muted", textClassName)}>
          {children}
        </Text>
      </View>
    );
  },
);
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
