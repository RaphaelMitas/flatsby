"use client";

import { cn } from ".";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

const sizeConfig = {
  xs: { className: "h-5 w-5", letters: 1, textClass: "text-[10px]" },
  sm: { className: "h-6 w-6", letters: 1, textClass: "text-xs" },
  md: { className: "h-8 w-8", letters: 2, textClass: "text-sm" },
  lg: { className: "h-10 w-10", letters: 2, textClass: "text-base" },
  xl: { className: "h-12 w-12", letters: 2, textClass: "text-lg" },
  "2xl": { className: "h-16 w-16", letters: 2, textClass: "text-xl" },
} as const;

type AvatarSize = keyof typeof sizeConfig;

interface UserAvatarProps {
  name: string;
  image?: string | null;
  size?: AvatarSize;
  className?: string;
}

export function UserAvatar({
  name,
  image,
  size = "md",
  className,
}: UserAvatarProps) {
  const config = sizeConfig[size];
  const initials = name.substring(0, config.letters).toUpperCase();

  return (
    <Avatar className={cn(config.className, className)}>
      <AvatarImage src={image ?? undefined} alt={name} />
      <AvatarFallback className={config.textClass}>{initials}</AvatarFallback>
    </Avatar>
  );
}
