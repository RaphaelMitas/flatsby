import type { ComponentType } from "react";

import { halloween } from "./halloween/halloween";

export interface RefreshSceneProps {
  refreshing: boolean;
}

export interface Season {
  RefreshScene?: ComponentType<RefreshSceneProps>;
  TapReaction?: ComponentType;
}

// Set to {} and drop the import to ship the plain app.
export const season: Season = halloween;
