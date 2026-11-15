import { Appearance } from "react-native";

import { storedChoice } from "~/utils/stored-choice";

const themes = ["light", "dark", "system"] as const;

export type Theme = (typeof themes)[number];

const themeChoice = storedChoice<Theme>(
  "theme_preference",
  (saved) => themes.find((theme) => theme === saved) ?? "system",
);

const applyColorScheme = (theme: Theme) => {
  Appearance.setColorScheme(theme === "system" ? "unspecified" : theme);
};

export const restoreTheme = () => themeChoice.read().then(applyColorScheme);

const setTheme = (newTheme: Theme) => {
  applyColorScheme(newTheme);
  themeChoice.save(newTheme);
};

export function useTheme() {
  return { storedTheme: themeChoice.useValue(), setTheme };
}
