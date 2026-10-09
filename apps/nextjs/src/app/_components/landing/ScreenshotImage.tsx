import Image from "next/image";

import { cn } from "@flatsby/ui";

import type { Screenshot } from "./pages";

export function ScreenshotImage({ shot }: { shot: Screenshot }) {
  const portrait = shot.height > shot.width;
  return (
    <Image
      src={shot.src}
      alt={shot.alt}
      width={shot.width}
      height={shot.height}
      sizes={portrait ? "288px" : "(min-width: 768px) 768px, 100vw"}
      className={cn(
        "mx-auto rounded-xl border shadow-sm",
        portrait ? "w-72" : "w-full",
      )}
    />
  );
}
