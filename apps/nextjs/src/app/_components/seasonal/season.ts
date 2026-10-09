import type { ComponentType } from "react";

import { halloween } from "./halloween/halloween";

export interface Season {
  TapReaction?: ComponentType;
}

// Set to {} and drop the import to ship the plain app.
export const season: Season = halloween;
