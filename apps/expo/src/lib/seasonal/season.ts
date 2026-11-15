import type { ComponentType } from "react";

import { winter } from "./winter/winter";

export interface Season {
  home?: {
    Backdrop: ComponentType;
    sky: string;
  };
  CatHat?: ComponentType<{ size: number }>;
}

export const season: Season = winter;
