import type { Season } from "../season";
import { Bats } from "./Bats";
import { NightSkyScene } from "./NightSkyScene";

export const halloween: Season = {
  RefreshScene: NightSkyScene,
  TapReaction: Bats,
};
