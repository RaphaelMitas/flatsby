import type { ComponentType } from "react";

import { winter } from "./winter/winter";

export interface Season {
  home?: {
    Backdrop: ComponentType;
    // Paints the status bar area, which the scrolling Backdrop can't reach
    sky: string;
  };
  CatHat?: ComponentType<{ size: number }>;
}

// Set to {} and drop the import to ship the plain app.
export const season: Season = winter;
