import type { ComponentType } from "react";

import { winter } from "./winter/winter";

export interface Season {
  HomeBackdrop?: ComponentType;
  // An SVG group in the cat's 229x255 coordinates
  CatHat?: ComponentType;
}

// Set to {} and drop the import to ship the plain app.
export const season: Season = winter;
