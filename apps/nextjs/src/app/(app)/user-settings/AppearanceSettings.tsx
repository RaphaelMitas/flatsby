"use client";

import { useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { cn } from "@flatsby/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import { Label } from "@flatsby/ui/label";
import { Slider } from "@flatsby/ui/slider";
import {
  accentScale,
  HUE_MAX,
  paletteIds,
  paletteTokens,
  parsePalette,
} from "@flatsby/validators/palette";

import {
  readStoredPalette,
  savePalette,
  subscribeToPalette,
} from "~/app/_components/layout/palette";

export function AppearanceSettings() {
  const t = useTranslations("settings");
  const stored = useSyncExternalStore(
    subscribeToPalette,
    readStoredPalette,
    () => undefined,
  );
  const mode = useTheme().resolvedTheme === "dark" ? "dark" : "light";
  const palette = parsePalette(stored ?? null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("items.appearance")}</CardTitle>
        <CardDescription>{t("appearance.colorsDescription")}</CardDescription>
      </CardHeader>
      <CardContent
        className={cn("grid gap-6", stored === undefined && "invisible")}
      >
        <fieldset className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <legend className="sr-only">{t("appearance.colors")}</legend>
          {paletteIds.map((id) => {
            const tokens = paletteTokens({ ...palette, id }, mode);
            const selected = palette.id === id;
            return (
              <label
                key={id}
                data-testid={`palette-${id}`}
                className="border-border has-checked:border-primary has-focus-visible:ring-ring/50 relative cursor-pointer overflow-hidden rounded-lg border-2 has-focus-visible:ring-4"
              >
                <input
                  type="radio"
                  name="palette"
                  className="sr-only"
                  checked={selected}
                  onChange={() => savePalette({ ...palette, id })}
                />
                <div
                  className="flex h-16 gap-2 p-2"
                  style={{ backgroundColor: tokens.background }}
                >
                  <div
                    className="flex flex-1 flex-col justify-center gap-1.5 rounded-md border px-2"
                    style={{
                      backgroundColor: tokens.card,
                      borderColor: tokens.border,
                    }}
                  >
                    <div
                      className="h-1.5 w-1/2 rounded-full"
                      style={{ backgroundColor: tokens.foreground }}
                    />
                    <div
                      className="h-1.5 w-4/5 rounded-full"
                      style={{ backgroundColor: tokens["muted-foreground"] }}
                    />
                  </div>
                  <div className="flex flex-col justify-center gap-1.5">
                    <div
                      className="size-6 rounded-md"
                      style={{ backgroundColor: tokens.primary }}
                    />
                    <div
                      className="h-2 w-6 rounded-full"
                      style={{ backgroundColor: tokens.muted }}
                    />
                  </div>
                </div>
                <div className="bg-card flex items-center justify-between border-t px-3 py-2 text-sm font-medium">
                  {t(`appearance.palettes.${id}`)}
                  {selected && <Check className="text-primary size-4" />}
                </div>
              </label>
            );
          })}
        </fieldset>
        {palette.id === "custom" && (
          <div className="grid gap-4 md:max-w-md">
            <div className="grid gap-3">
              <Label>{t("appearance.accent")}</Label>
              <Slider
                aria-label={t("appearance.accent")}
                max={HUE_MAX}
                value={[palette.hue]}
                trackStyle={{
                  backgroundImage: `linear-gradient(to right, ${accentScale(mode).join(", ")})`,
                }}
                onValueChange={([hue = palette.hue]) =>
                  savePalette({ ...palette, hue })
                }
              />
            </div>
            <div className="grid gap-3">
              <Label>{t("appearance.tint")}</Label>
              <Slider
                aria-label={t("appearance.tint")}
                max={1}
                step={0.01}
                value={[palette.tint]}
                onValueChange={([tint = palette.tint]) =>
                  savePalette({ ...palette, tint })
                }
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
