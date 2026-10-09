import type { ComponentType } from "react";

import { Bats } from "./halloween/Bats";
import { NightSkyScene } from "./halloween/NightSkyScene";

export interface RefreshSceneProps {
  refreshing: boolean;
}

interface Season {
  RefreshScene?: ComponentType<RefreshSceneProps>;
  TapReaction?: ComponentType;
}

// Everything seasonal hangs off this; set it to {} to ship the plain app.
export const season: Season = {
  RefreshScene: NightSkyScene,
  TapReaction: Bats,
};
