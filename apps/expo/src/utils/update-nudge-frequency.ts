import { useTranslations } from "use-intl";

import { storedChoice } from "./stored-choice";

const frequencies = ["off", "monthly", "version"] as const;

export type UpdateNudgeFrequency = (typeof frequencies)[number];

export const updateNudgeFrequency = storedChoice<UpdateNudgeFrequency>(
  "update_nudge_frequency",
  (saved) => frequencies.find((frequency) => frequency === saved) ?? "version",
);

export function useUpdateNudgeChoices() {
  const t = useTranslations("settings.items");
  const labels = {
    off: t("updateNudgeOff"),
    monthly: t("updateNudgeMonthly"),
    version: t("updateNudgeVersion"),
  } satisfies Record<UpdateNudgeFrequency, string>;
  const choices = frequencies.map((value) => ({ value, label: labels[value] }));
  return { labels, choices };
}
