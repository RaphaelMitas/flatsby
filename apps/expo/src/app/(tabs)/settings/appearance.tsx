import type { PaletteTokens } from "@flatsby/validators/palette";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Slider } from "@expo/ui/community/slider";
import { useTranslations } from "use-intl";

import {
  accentScale,
  HUE_MAX,
  paletteIds,
  paletteTokens,
} from "@flatsby/validators/palette";

import { ChoiceButtons } from "~/components/settings/ChoiceButtons";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { useTheme } from "~/lib/ui/theme";
import { cn } from "~/lib/utils";

function PaletteTile(props: {
  testID: string;
  label: string;
  selected: boolean;
  tokens: PaletteTokens;
  onPress: () => void;
}) {
  return (
    <View className="w-1/2 p-1.5">
      <Pressable
        testID={props.testID}
        accessibilityRole="radio"
        accessibilityState={{ selected: props.selected }}
        onPress={props.onPress}
        className={cn(
          "overflow-hidden rounded-lg border-2",
          props.selected ? "border-primary" : "border-border",
        )}
      >
        <View
          className="h-16 flex-row gap-2 p-2"
          style={{ backgroundColor: props.tokens.background }}
        >
          <View
            className="flex-1 justify-center gap-1.5 rounded-md border px-2"
            style={{
              backgroundColor: props.tokens.card,
              borderColor: props.tokens.border,
            }}
          >
            <View
              className="h-1.5 w-1/2 rounded-full"
              style={{ backgroundColor: props.tokens.foreground }}
            />
            <View
              className="h-1.5 w-4/5 rounded-full"
              style={{ backgroundColor: props.tokens["muted-foreground"] }}
            />
          </View>
          <View className="justify-center gap-1.5">
            <View
              className="size-6 rounded-md"
              style={{ backgroundColor: props.tokens.primary }}
            />
            <View
              className="h-2 w-6 rounded-full"
              style={{ backgroundColor: props.tokens.muted }}
            />
          </View>
        </View>
        <View className="border-border bg-card flex-row items-center justify-between border-t px-3 py-2">
          <Text className="text-foreground text-sm font-medium">
            {props.label}
          </Text>
          {props.selected && <Icon name="check" size={16} color="primary" />}
        </View>
      </Pressable>
    </View>
  );
}

export default function AppearanceScreen() {
  const t = useTranslations("settings");
  const { storedTheme, setTheme, palette, setPalette, colorMode, tokens } =
    useTheme();

  return (
    <SafeAreaView>
      <AppScrollView>
        <SettingsSection title={t("appearance.mode")}>
          <View className="flex-row gap-2 p-4">
            <ChoiceButtons
              choices={[
                { value: "system", label: t("theme.system"), icon: "sun-moon" },
                { value: "light", label: t("theme.light"), icon: "sun" },
                { value: "dark", label: t("theme.dark"), icon: "moon" },
              ]}
              selected={storedTheme}
              onSelect={setTheme}
            />
          </View>
        </SettingsSection>
        <SettingsSection title={t("appearance.colors")} className="pb-4">
          <View className="flex-row flex-wrap p-2.5">
            {paletteIds.map((id) => (
              <PaletteTile
                key={id}
                testID={`palette-${id}`}
                label={t(`appearance.palettes.${id}`)}
                selected={palette.id === id}
                tokens={paletteTokens({ ...palette, id }, colorMode)}
                onPress={() => setPalette({ ...palette, id })}
              />
            ))}
          </View>
          {palette.id === "custom" && (
            <View testID="palette-sliders" className="gap-2 px-4 pb-4">
              <Text className="text-foreground text-sm font-medium">
                {t("appearance.accent")}
              </Text>
              <LinearGradient
                colors={accentScale(colorMode)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 8, borderRadius: 4 }}
              />
              <Slider
                accessibilityLabel={t("appearance.accent")}
                value={palette.hue}
                maximumValue={HUE_MAX}
                minimumTrackTintColor={tokens.primary}
                thumbTintColor={tokens.primary}
                onValueChange={(hue) => setPalette({ ...palette, hue })}
              />
              <Text className="text-foreground text-sm font-medium">
                {t("appearance.tint")}
              </Text>
              <Slider
                accessibilityLabel={t("appearance.tint")}
                value={palette.tint}
                minimumTrackTintColor={tokens.primary}
                thumbTintColor={tokens.primary}
                onValueChange={(tint) => setPalette({ ...palette, tint })}
              />
            </View>
          )}
        </SettingsSection>
      </AppScrollView>
    </SafeAreaView>
  );
}
