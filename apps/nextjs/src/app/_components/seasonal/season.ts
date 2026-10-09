import type { ComponentType } from "react";

import { Bats } from "./halloween/bats";

interface Season {
  TapReaction?: ComponentType;
}

// Everything seasonal hangs off this; set it to {} to ship the plain app.
export const season: Season = {
  TapReaction: Bats,
};
