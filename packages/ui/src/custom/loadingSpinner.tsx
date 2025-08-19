import { LoaderCircle } from "lucide-react";

import { cn } from "..";

export interface ISVGProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export default function LoadingSpinner({
  size = 24,
  className,
  ...props
}: ISVGProps) {
  return (
    <LoaderCircle
      className={cn("animate-spin", className)}
      size={size}
      {...props}
    />
  );
}
