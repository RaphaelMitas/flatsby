"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { SidebarMenuButton } from "@flatsby/ui/sidebar";

export function SidebarThemeToggle() {
  const { setTheme, theme } = useTheme();
  const t = useTranslations("settings.theme");

  const cycleTheme = () => {
    if (theme === "system") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("system");
    }
  };

  const getIcon = () => {
    if (theme === "dark") return <Moon className="size-4" />;
    if (theme === "light") return <Sun className="size-4" />;
    return <SunMoon className="size-4" />;
  };

  const getLabel = () => {
    if (theme === "dark") return t("dark");
    if (theme === "light") return t("light");
    return t("system");
  };

  return (
    <SidebarMenuButton
      onClick={cycleTheme}
      tooltip={t("current", { theme: getLabel() })}
    >
      {getIcon()}
      <span>{getLabel()}</span>
    </SidebarMenuButton>
  );
}
