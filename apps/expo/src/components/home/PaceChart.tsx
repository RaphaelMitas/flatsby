import type { Pace, PacePoint } from "@flatsby/validators/home";
import type { ComponentRef } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Svg,
  Text,
} from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { useLocale, useTranslations } from "use-intl";

import { daysInMonth, monthOf } from "@flatsby/validators/calendar";
import { paceAt, paceChart, paceLabels } from "@flatsby/validators/home";

import { Skeleton } from "~/lib/ui/skeleton";
import { useThemeColors } from "~/lib/utils";

const INSET = 8;
const LABEL_ROW = 20;
const LABEL_GAP = 48;
const SCRUB_START = 4;
const NOT_SCRUBBED = -1;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

const heightOf = (height: number, labelled: boolean) =>
  height + 2 * INSET + (labelled ? LABEL_ROW : 0);

const dotAt = (dot: { x: number; y: number } | null | undefined) => {
  "worklet";
  return { cx: dot?.x ?? 0, cy: dot?.y ?? 0, opacity: dot ? 1 : 0 };
};

export function PaceChart({
  pace,
  today,
  ...size
}: {
  pace: Pace | undefined;
  today: string | undefined;
  height: number;
  labelled?: boolean;
  wholeMonth?: boolean;
  drawIn: boolean;
  onScrub?: (point: PacePoint | null) => void;
}) {
  if (!pace || !today)
    return (
      <Skeleton
        className="bg-foreground/10 mt-3 rounded-xl"
        style={{ height: heightOf(size.height, size.labelled ?? false) }}
      />
    );
  return <DrawnPaceChart pace={pace} today={today} {...size} />;
}

function DrawnPaceChart({
  pace,
  today,
  height,
  labelled = false,
  wholeMonth = false,
  drawIn,
  onScrub,
}: {
  pace: Pace;
  today: string;
  height: number;
  labelled?: boolean;
  wholeMonth?: boolean;
  drawIn: boolean;
  onScrub?: (point: PacePoint | null) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { getColor } = useThemeColors();
  const labels = labelled && paceLabels(today, locale);
  const box = useRef<ComponentRef<typeof View>>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    setWidth(box.current?.getBoundingClientRect().width ?? 0);
  }, []);
  const drawn = useSharedValue(drawIn ? 0 : 1);
  useEffect(() => {
    if (width > 0) drawn.set(withTiming(1, { duration: 600 }));
  }, [drawn, width]);
  const reveal = useAnimatedStyle(() => ({ width: `${drawn.get() * 100}%` }));
  const plotWidth = Math.max(width - 2 * INSET, 1);
  const size = { width: plotWidth, height };
  const chart = paceChart(pace, today, size);
  const foreground = getColor("foreground");
  const muted = getColor("muted-foreground");
  const card = getColor("card");
  const totalHeight = heightOf(height, labelled);

  const lastDay = daysInMonth(monthOf(today)) - 1;
  const points = onScrub
    ? Array.from({ length: lastDay + 1 }, (_, day) =>
        paceAt(pace, today, size, (day / lastDay) * plotWidth),
      )
    : [];
  const scrubbed = useSharedValue(NOT_SCRUBBED);
  const report = (day: number) => onScrub?.(points[day] ?? null);
  const scrub = Gesture.Pan()
    .enabled(onScrub !== undefined)
    .activeOffsetX([-SCRUB_START, SCRUB_START])
    .failOffsetY([-SCRUB_START, SCRUB_START])
    .onUpdate(({ x }) => {
      const day = Math.min(
        lastDay,
        Math.max(0, Math.round(((x - INSET) / plotWidth) * lastDay)),
      );
      if (day === scrubbed.get()) return;
      scrubbed.set(day);
      scheduleOnRN(report, day);
    })
    .onFinalize(() => {
      if (scrubbed.get() === NOT_SCRUBBED) return;
      scrubbed.set(NOT_SCRUBBED);
      scheduleOnRN(report, NOT_SCRUBBED);
    });
  const endProps = useAnimatedProps(() => ({
    opacity: scrubbed.get() === NOT_SCRUBBED ? 1 : 0.25,
  }));
  const guideProps = useAnimatedProps(() => {
    const x = points[scrubbed.get()]?.x;
    return { x1: x ?? 0, x2: x ?? 0, opacity: x === undefined ? 0 : 1 };
  });
  const nowProps = useAnimatedProps(() => dotAt(points[scrubbed.get()]?.now));
  const beforeProps = useAnimatedProps(() =>
    dotAt(points[scrubbed.get()]?.before),
  );

  const beforeEnd = chart.beforeEnd.y;
  const monthLabelY =
    beforeEnd + 18 < height - 4 ? beforeEnd + 18 : beforeEnd - 8;
  const todayX = Math.min(Math.max(chart.end.x, 16), plotWidth - 16);
  const labelY = height + LABEL_ROW - 4;

  return (
    <GestureDetector gesture={scrub}>
      <View
        ref={box}
        className="mt-3"
        style={{ height: totalHeight }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        <Animated.View className="overflow-hidden" style={reveal}>
          <Svg width={width} height={totalHeight}>
            <Defs>
              <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={foreground} stopOpacity={0.13} />
                <Stop offset="1" stopColor={foreground} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <G x={INSET} y={INSET}>
              <Line
                x1={0}
                y1={height}
                x2={plotWidth}
                y2={height}
                stroke={getColor("border")}
                strokeWidth={1}
              />
              <Path d={chart.area} fill="url(#fade)" />
              <Path
                d={chart.before}
                fill="none"
                stroke={muted}
                strokeOpacity={0.5}
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray="1 6"
              />
              <Path
                d={chart.now}
                fill="none"
                stroke={foreground}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <AnimatedCircle
                animatedProps={endProps}
                cx={chart.end.x}
                cy={chart.end.y}
                r={5.5}
                fill={foreground}
                stroke={card}
                strokeWidth={3}
              />
              {onScrub && (
                <>
                  <AnimatedLine
                    animatedProps={guideProps}
                    y1={0}
                    y2={height}
                    stroke={getColor("border")}
                    strokeWidth={1}
                  />
                  <AnimatedCircle
                    animatedProps={beforeProps}
                    r={3.5}
                    fill={card}
                    stroke={muted}
                    strokeWidth={2}
                  />
                  <AnimatedCircle
                    animatedProps={nowProps}
                    r={5.5}
                    fill={foreground}
                    stroke={card}
                    strokeWidth={3}
                  />
                </>
              )}
              {labels && (
                <G fill={muted} fontSize={11} fontWeight="500">
                  <Text x={plotWidth} y={monthLabelY} textAnchor="end">
                    {labels.previousMonth}
                  </Text>
                  {todayX > LABEL_GAP && (
                    <Text x={0} y={labelY}>
                      {labels.start}
                    </Text>
                  )}
                  {!wholeMonth && (
                    <Text x={todayX} y={labelY} textAnchor="middle">
                      {t("calendar.today")}
                    </Text>
                  )}
                  {(wholeMonth || todayX < plotWidth - LABEL_GAP) && (
                    <Text x={plotWidth} y={labelY} textAnchor="end">
                      {labels.end}
                    </Text>
                  )}
                </G>
              )}
            </G>
          </Svg>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
