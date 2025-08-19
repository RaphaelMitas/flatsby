"use client";

import * as React from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-center">
          {theme === "dark" ? (
            <Moon className="mr-2 h-4 w-4" />
          ) : theme === "light" ? (
            <Sun className="mr-2 h-4 w-4 text-primary" />
          ) : (
            <SunMoon className="mr-2 h-4 w-4 text-primary" />
          )}
          {theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System"}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={`w-56 cursor-pointer py-3`}
        >
          <SunMoon className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={`w-56 cursor-pointer py-3`}
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={`w-56 cursor-pointer py-3`}
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
