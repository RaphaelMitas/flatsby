"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";

import { SidebarMenuButton } from "@flatsby/ui/sidebar";

export function SidebarThemeToggle() {
  const { setTheme, theme } = useTheme();

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
    if (theme === "dark") return "Dark";
    if (theme === "light") return "Light";
    return "System";
  };

  return (
    <SidebarMenuButton onClick={cycleTheme} tooltip={`Theme: ${getLabel()}`}>
      {getIcon()}
      <span>{getLabel()}</span>
    </SidebarMenuButton>
  );
}
