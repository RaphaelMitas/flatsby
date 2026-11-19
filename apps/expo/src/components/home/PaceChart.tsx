import type { Pace } from "@flatsby/validators/home";
import type { ComponentRef } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, {
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
import { useLocale, useTranslations } from "use-intl";

import { paceChart, paceLabels } from "@flatsby/validators/home";

import { Skeleton } from "~/lib/ui/skeleton";
import { useThemeColors } from "~/lib/utils";

const INSET = 8;
const LABEL_ROW = 20;
const LABEL_GAP = 48;

const heightOf = (height: number, labelled: boolean) =>
  height + 2 * INSET + (labelled ? LABEL_ROW : 0);

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
}: {
  pace: Pace;
  today: string;
  height: number;
  labelled?: boolean;
  wholeMonth?: boolean;
  drawIn: boolean;
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
  const chart = paceChart(pace, today, { width: plotWidth, height });
  const foreground = getColor("foreground");
  const muted = getColor("muted-foreground");
  const totalHeight = heightOf(height, labelled);

  const beforeEnd = chart.beforeEnd.y;
  const monthLabelY =
    beforeEnd + 18 < height - 4 ? beforeEnd + 18 : beforeEnd - 8;
  const todayX = Math.min(Math.max(chart.end.x, 16), plotWidth - 16);
  const labelY = height + LABEL_ROW - 4;

  return (
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
            <Circle
              cx={chart.end.x}
              cy={chart.end.y}
              r={5.5}
              fill={foreground}
              stroke={getColor("card")}
              strokeWidth={3}
            />
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
  );
}
