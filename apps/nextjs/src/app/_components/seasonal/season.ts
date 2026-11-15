import type { ComponentType } from "react";

import { winter } from "./winter/winter";

export interface Season {
  HomeBackdrop?: ComponentType;
  CatHat?: ComponentType;
}

export const season: Season = winter;
