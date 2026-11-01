import type { Season } from "../season";
import { RooftopScene, SKY } from "./RooftopScene";
import { SantaHat } from "./SantaHat";

export const winter: Season = {
  home: { Backdrop: RooftopScene, sky: SKY },
  CatHat: SantaHat,
};
