"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { Button } from "@flatsby/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@flatsby/ui/dropdown-menu";

export function ModeToggle() {
  const { setTheme, theme } = useTheme();
  const t = useTranslations("settings.theme");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-center">
          {theme === "dark" ? (
            <Moon className="mr-2 h-4 w-4" />
          ) : theme === "light" ? (
            <Sun className="text-primary mr-2 h-4 w-4" />
          ) : (
            <SunMoon className="text-primary mr-2 h-4 w-4" />
          )}
          {theme === "dark"
            ? t("dark")
            : theme === "light"
              ? t("light")
              : t("system")}
          <span className="sr-only">{t("toggle")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={`w-56 cursor-pointer py-3`}
        >
          <SunMoon className="mr-2 h-4 w-4" />
          {t("system")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={`w-56 cursor-pointer py-3`}
        >
          <Sun className="mr-2 h-4 w-4" />
          {t("light")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={`w-56 cursor-pointer py-3`}
        >
          <Moon className="mr-2 h-4 w-4" />
          {t("dark")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
