import { storedChoice } from "./stored-choice";

export type UpdateNudgeFrequency = "off" | "monthly" | "version";

export const updateNudgeFrequency = storedChoice<UpdateNudgeFrequency>(
  "update_nudge_frequency",
  (saved) => (saved === "off" || saved === "monthly" ? saved : "version"),
);
