"use client";

import type { Palette } from "@flatsby/validators/palette";
import { useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import { Slider } from "@flatsby/ui/slider";
import { toast } from "@flatsby/ui/toast";
import {
  HUE_MAX,
  hueScale,
  paletteCss,
  paletteIds,
} from "@flatsby/validators/palette";

import { rootPaletteSelector } from "~/app/_components/layout/palette";
import { setPalettePreference } from "./actions";

export function AppearanceSettings(props: { palette: Palette }) {
  const t = useTranslations();
  const [palette, setPalette] = useState(props.palette);

  const save = (next: Palette) => {
    setPalette(next);
    setPalettePreference(next).catch(() => toast.error(t("errors.unexpected")));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.items.appearance")}</CardTitle>
        <CardDescription>
          {t("settings.appearance.colorsDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <style>
          {[
            paletteCss(palette, rootPaletteSelector),
            ...paletteIds.map((id) =>
              paletteCss(
                { ...palette, id },
                {
                  light: `[data-palette="${id}"]`,
                  dark: `.dark [data-palette="${id}"]`,
                },
              ),
            ),
          ].join("")}
        </style>
        <fieldset className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <legend className="sr-only">{t("settings.appearance.colors")}</legend>
          {paletteIds.map((id) => (
            <label
              key={id}
              data-testid={`palette-${id}`}
              className="border-border has-checked:border-primary has-focus-visible:ring-ring/50 relative cursor-pointer overflow-hidden rounded-lg border-2 has-focus-visible:ring-4"
            >
              <input
                type="radio"
                name="palette"
                className="sr-only"
                checked={palette.id === id}
                onChange={() => save({ ...palette, id })}
              />
              <div
                data-palette={id}
                className="bg-background flex h-16 gap-2 p-2"
              >
                <div className="bg-card border-border flex flex-1 flex-col justify-center gap-1.5 rounded-md border px-2">
                  <div className="bg-foreground h-1.5 w-1/2 rounded-full" />
                  <div className="bg-muted-foreground h-1.5 w-4/5 rounded-full" />
                </div>
                <div className="flex flex-col justify-center gap-1.5">
                  <div className="bg-primary size-6 rounded-md" />
                  <div className="bg-muted h-2 w-6 rounded-full" />
                </div>
              </div>
              <div className="bg-card flex items-center justify-between border-t px-3 py-2 text-sm font-medium">
                {t(`settings.appearance.palettes.${id}`)}
                {palette.id === id && <Check className="text-primary size-4" />}
              </div>
            </label>
          ))}
        </fieldset>
        {palette.id === "custom" && (
          <div className="grid gap-4 md:max-w-md">
            <div className="grid gap-3">
              <p className="text-sm leading-none font-medium">
                {t("settings.appearance.accent")}
              </p>
              <Slider
                aria-label={t("settings.appearance.accent")}
                max={HUE_MAX}
                value={[palette.hue]}
                trackStyle={{
                  backgroundImage: `linear-gradient(to right, ${hueScale.join(", ")})`,
                }}
                onValueChange={([hue = palette.hue]) =>
                  setPalette({ ...palette, hue })
                }
                onValueCommit={([hue = palette.hue]) =>
                  save({ ...palette, hue })
                }
              />
            </div>
            <div className="grid gap-3">
              <p className="text-sm leading-none font-medium">
                {t("settings.appearance.tint")}
              </p>
              <Slider
                aria-label={t("settings.appearance.tint")}
                max={1}
                step={0.01}
                value={[palette.tint]}
                onValueChange={([tint = palette.tint]) =>
                  setPalette({ ...palette, tint })
                }
                onValueCommit={([tint = palette.tint]) =>
                  save({ ...palette, tint })
                }
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
