import type { Pace } from "@flatsby/validators/home";
import { useState } from "react";
import { View } from "react-native";
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

import { paceChart } from "@flatsby/validators/home";

import { useThemeColors } from "~/lib/utils";

const INSET = 8;
const LABEL_ROW = 20;
const LABEL_GAP = 48;

export interface PaceChartLabels {
  start: string;
  today: string;
  end: string;
  previousMonth: string;
}

export function PaceChart({
  pace,
  today,
  height,
  labels,
}: {
  pace: Pace;
  today: string;
  height: number;
  labels?: PaceChartLabels;
}) {
  const { getColor } = useThemeColors();
  const [width, setWidth] = useState(0);
  const plotWidth = Math.max(width - 2 * INSET, 1);
  const chart = paceChart(pace, today, { width: plotWidth, height });
  const foreground = getColor("foreground");
  const muted = getColor("muted-foreground");
  const totalHeight = height + 2 * INSET + (labels ? LABEL_ROW : 0);

  const beforeEnd = chart.beforeEnd.y;
  const monthLabelY =
    beforeEnd + 18 < height - 4 ? beforeEnd + 18 : beforeEnd - 8;
  const todayX = Math.min(Math.max(chart.end.x, 16), plotWidth - 16);
  const labelY = height + LABEL_ROW - 4;

  return (
    <View
      className="mt-3"
      style={{ height: totalHeight }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && (
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
                <Text x={todayX} y={labelY} textAnchor="middle">
                  {labels.today}
                </Text>
                {todayX < plotWidth - LABEL_GAP && (
                  <Text x={plotWidth} y={labelY} textAnchor="end">
                    {labels.end}
                  </Text>
                )}
              </G>
            )}
          </G>
        </Svg>
      )}
    </View>
  );
}
