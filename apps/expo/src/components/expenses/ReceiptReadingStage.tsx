import type { StageTag } from "@flatsby/validators/expenses/receipt-scan";
import type { useReceiptScan } from "@flatsby/validators/expenses/useReceiptScan";
import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Image,
  Modal,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslations } from "use-intl";

import { Button } from "~/lib/ui/button";
import FlatsbyCat from "~/lib/ui/custom/icons/FlatsbyCat";
import Icon from "~/lib/ui/custom/icons/Icon";
import { useThemeColors } from "~/lib/utils";

type ReceiptScan = ReturnType<typeof useReceiptScan>;
export interface StagePhoto {
  uri: string;
  width: number;
  height: number;
}
export interface StageOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

const LENS = 92;
const MAG = 1.9;
const CAT = 150;
const PEEK = 56;
const HIDDEN = 420;
// Reading order over the photo, as fractions of its width and height
const PATH_X = [0.5, 0.28, 0.7, 0.3, 0.72, 0.35, 0.68, 0.45, 0.5];
const PATH_Y = [0.1, 0.24, 0.3, 0.45, 0.52, 0.66, 0.74, 0.88, 0.1];
const STEPS = PATH_X.map((_, i) => i);

export function ReceiptReadingStage({
  receiptScan,
  photo,
  origin,
}: {
  receiptScan: ReceiptScan;
  photo?: StagePhoto;
  origin?: StageOrigin;
}) {
  const t = useTranslations("expenses.receiptScan");
  const tCommon = useTranslations("common");
  const { getColor } = useThemeColors();
  const insets = useSafeAreaInsets();
  const screen = useWindowDimensions();
  const reduced = useReducedMotion();
  const { phase, revealed } = receiptScan.stage;
  const open = phase !== "closed";
  const [mounted, setMounted] = useState(false);

  const fade = useSharedValue(0);
  const enter = useSharedValue(0);
  const settle = useSharedValue(0);
  const catY = useSharedValue(HIDDEN);
  const catTurn = useSharedValue(0);
  const catDip = useSharedValue(0);
  const lensOn = useSharedValue(0);
  const fog = useSharedValue(0);
  const walk = useSharedValue(0);
  const panelY = useSharedValue(420);
  const peekY = useSharedValue(PEEK);

  const scale = photo
    ? Math.min(
        Math.min(screen.width - 80, 300) / photo.width,
        (screen.height * 0.46) / photo.height,
      )
    : 1;
  const boxW = photo ? photo.width * scale : 0;
  const boxH = photo ? photo.height * scale : 0;
  const boxX = (screen.width - boxW) / 2;
  const boxY = insets.top + 132;

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (phase === "reading") {
      fade.set(withTiming(1, { duration: 220 }));
      enter.set(0);
      enter.set(reduced ? 1 : withSpring(1, { damping: 18, stiffness: 140 }));
      settle.set(0);
      catY.set(HIDDEN);
      catY.set(withSpring(0, { damping: 13 }));
      catTurn.set(0);
      fog.set(0);
      panelY.set(420);
      peekY.set(PEEK);
      lensOn.set(withTiming(1, { duration: 300 }));
      walk.set(0);
      if (!reduced) {
        walk.set(
          withRepeat(
            withTiming(STEPS.length - 1, {
              duration: (STEPS.length - 1) * 650,
              easing: Easing.inOut(Easing.quad),
            }),
            -1,
          ),
        );
      }
    }
    if (phase === "preview") {
      cancelAnimation(walk);
      lensOn.set(withTiming(0, { duration: 200 }));
      settle.set(
        withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
      );
      catY.set(withTiming(HIDDEN, { duration: 260 }));
      panelY.set(withSpring(0, { damping: 17, stiffness: 150 }));
      peekY.set(withSpring(0, { damping: 12 }));
    }
    if (phase === "failing") {
      cancelAnimation(walk);
      fog.set(withTiming(1, { duration: 500 }));
      catTurn.set(
        withSequence(
          withTiming(-9, { duration: 300 }),
          withTiming(-9, { duration: 700 }),
          withTiming(8, { duration: 120 }),
          withTiming(-6, { duration: 120 }),
          withTiming(4, { duration: 120 }),
          withTiming(0, { duration: 160 }),
        ),
      );
      lensOn.set(
        withSequence(
          withTiming(1, { duration: 1100 }),
          withTiming(0, { duration: 200 }),
        ),
      );
    }
    if (phase === "closed") {
      fade.set(
        withTiming(0, { duration: 220 }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [
    phase,
    reduced,
    fade,
    enter,
    settle,
    catY,
    catTurn,
    fog,
    panelY,
    peekY,
    lensOn,
    walk,
  ]);

  const failing = phase === "failing";
  const caption = failing
    ? receiptScan.state.status === "failed" && receiptScan.state.message
      ? t("stageFailed")
      : t("stageBlurry")
    : t("stageCaption");
  const values = receiptScan.preview;
  const spoken =
    phase === "preview" && values
      ? [values.store, values.amount, values.date].filter(Boolean).join(", ")
      : phase === "closed"
        ? ""
        : caption;

  useEffect(() => {
    if (spoken) AccessibilityInfo.announceForAccessibility(spoken);
  }, [spoken]);

  useEffect(() => {
    if (revealed.length === 0 || reduced) return;
    catDip.set(
      withSequence(
        withTiming(7, { duration: 120 }),
        withSpring(0, { damping: 8 }),
      ),
    );
  }, [revealed.length, reduced, catDip]);

  const lensX = useDerivedValue(
    () => interpolate(walk.get(), STEPS, PATH_X) * boxW,
  );
  const lensY = useDerivedValue(
    () => interpolate(walk.get(), STEPS, PATH_Y) * boxH,
  );
  const look = useDerivedValue(
    () =>
      lensOn.get() *
      interpolate(lensX.get() / Math.max(boxW, 1), [0, 1], [-5, 5]),
  );

  const backdrop = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const photoStyle = useAnimatedStyle(() => {
    const fromScale = origin ? origin.width / Math.max(boxW, 1) : 0.4;
    const dx = origin ? origin.x + origin.width / 2 - (boxX + boxW / 2) : 0;
    const dy = origin ? origin.y + origin.height / 2 - (boxY + boxH / 2) : 0;
    return {
      transform: [
        { translateX: dx * (1 - enter.get()) },
        { translateY: dy * (1 - enter.get()) - settle.get() * boxH * 0.14 },
        {
          scale:
            interpolate(enter.get(), [0, 1], [fromScale, 1]) *
            interpolate(settle.get(), [0, 1], [1, 0.62]),
        },
      ],
    };
  });
  const lensStyle = useAnimatedStyle(() => ({
    opacity: lensOn.get(),
    transform: [
      { translateX: lensX.get() - LENS / 2 },
      { translateY: lensY.get() - LENS / 2 },
      { scale: interpolate(lensOn.get(), [0, 1], [0.3, 1]) },
    ],
  }));
  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: LENS / 2 - 4 - lensX.get() * MAG },
      { translateY: LENS / 2 - 4 - lensY.get() * MAG },
    ],
  }));
  const fogStyle = useAnimatedStyle(() => ({ opacity: fog.get() * 0.75 }));
  const catStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: catY.get() + catDip.get() },
      { rotate: `${catTurn.get()}deg` },
    ],
  }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: panelY.get() }],
  }));
  const peekStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: peekY.get() }],
  }));

  const leave = (action: () => void) => {
    peekY.set(withTiming(PEEK, { duration: 140 }));
    setTimeout(action, 140);
  };

  const tagValue = (tag: StageTag) =>
    tag === "store"
      ? values?.store
      : tag === "amount"
        ? values?.amount
        : values?.date;

  if (!mounted || !photo) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={receiptScan.reset}
    >
      <Animated.View
        testID="receipt-scan-stage"
        accessibilityViewIsModal
        style={[{ flex: 1 }, backdrop]}
      >
        <LinearGradient
          colors={[getColor("background"), getColor("muted")]}
          style={{ position: "absolute", inset: 0 }}
        />
        <Pressable
          testID="receipt-scan-close"
          accessibilityRole="button"
          accessibilityLabel={tCommon("close")}
          onPress={receiptScan.reset}
          hitSlop={8}
          style={{ position: "absolute", top: insets.top + 8, left: 16 }}
          className="bg-muted size-10 items-center justify-center rounded-full"
        >
          <Icon name="x" size={20} color="foreground" />
        </Pressable>

        <Text
          style={{
            position: "absolute",
            top: insets.top + 64,
            left: 0,
            right: 0,
          }}
          className="text-foreground text-center text-base font-semibold"
          accessibilityLiveRegion="polite"
        >
          {caption}
        </Text>
        <View
          style={{
            position: "absolute",
            top: insets.top + 94,
            left: 24,
            right: 24,
          }}
          className="flex-row flex-wrap justify-center gap-1.5"
        >
          {phase !== "failing" &&
            revealed.map((tag) => (
              <Animated.View
                key={tag}
                entering={reduced ? undefined : ZoomIn.springify().damping(12)}
                className="bg-primary flex-row gap-1 rounded-full px-3 py-1"
              >
                <Text className="text-primary-foreground/60 text-xs">
                  {t(tag)}
                </Text>
                <Text className="text-primary-foreground text-xs font-semibold">
                  {tagValue(tag)}
                </Text>
              </Animated.View>
            ))}
        </View>

        <Animated.View
          style={[
            {
              position: "absolute",
              left: boxX,
              top: boxY,
              width: boxW,
              height: boxH,
            },
            photoStyle,
          ]}
        >
          <Image
            source={{ uri: photo.uri }}
            style={{ width: boxW, height: boxH, borderRadius: 6 }}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                left: 0,
                top: 0,
                width: LENS,
                height: LENS,
                borderRadius: LENS / 2,
                borderWidth: 4,
                borderColor: getColor("foreground"),
                overflow: "hidden",
                backgroundColor: getColor("background"),
              },
              lensStyle,
            ]}
          >
            <Animated.Image
              source={{ uri: photo.uri }}
              style={[{ width: boxW * MAG, height: boxH * MAG }, zoomStyle]}
            />
            <Animated.View
              style={[
                { position: "absolute", inset: 0, backgroundColor: "#fff" },
                fogStyle,
              ]}
            />
          </Animated.View>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              bottom: insets.bottom + 24,
              left: (screen.width - CAT) / 2,
            },
            catStyle,
          ]}
        >
          <FlatsbyCat
            size={CAT}
            color={getColor("primary")}
            animated
            squint={failing}
            monocle={phase === "preview"}
            look={look}
          />
        </Animated.View>

        <Animated.View
          testID="receipt-scan-preview"
          style={[
            {
              position: "absolute",
              left: 8,
              right: 8,
              bottom: insets.bottom + 8,
            },
            panelStyle,
          ]}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -PEEK,
              alignSelf: "center",
              height: PEEK,
              overflow: "hidden",
            }}
          >
            <Animated.View style={peekStyle}>
              <FlatsbyCat size={104} color={getColor("primary")} animated />
            </Animated.View>
          </View>
          <GlassView
            glassEffectStyle="regular"
            style={{ borderRadius: 36, overflow: "hidden" }}
            className={
              isLiquidGlassAvailable()
                ? undefined
                : "bg-background border-border border"
            }
          >
            <View className="gap-3 px-6 pt-6 pb-6">
              <Text className="text-foreground text-lg font-semibold">
                {t("previewTitle")}
              </Text>
              <PreviewRow
                label={t("store")}
                value={receiptScan.preview?.store}
              />
              <PreviewRow
                label={t("amount")}
                value={receiptScan.preview?.amount}
              />
              <PreviewRow label={t("date")} value={receiptScan.preview?.date} />
              <View className="mt-2 flex-row gap-2">
                <Button
                  testID="receipt-scan-discard"
                  title={t("discard")}
                  variant="outline"
                  className="flex-1"
                  onPress={() => leave(receiptScan.reset)}
                />
                <Button
                  testID="receipt-scan-apply"
                  title={t("apply")}
                  className="flex-1"
                  onPress={() => leave(receiptScan.apply)}
                />
              </View>
            </View>
          </GlassView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  const t = useTranslations("expenses.receiptScan");
  return (
    <View className="flex-row justify-between gap-4">
      <Text className="text-muted-foreground">{label}</Text>
      <Text
        className={
          value
            ? "text-foreground flex-1 text-right font-semibold"
            : "text-warning flex-1 text-right"
        }
      >
        {value ?? t("notFound")}
      </Text>
    </View>
  );
}
