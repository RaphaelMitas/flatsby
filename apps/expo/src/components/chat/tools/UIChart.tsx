import type { ChartDataPoint } from "@flatsby/validators/chat/tools";
import { Text, View } from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-gifted-charts";

import type { ColorName } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { useThemeColors } from "~/lib/utils";

// Color palette matching the app theme
const CHART_COLORS = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const satisfies ColorName[];

interface ChartDataItem {
  value: number;
  label: string;
  color: string;
  text: string;
}

const ChartLegend = ({ data }: { data: ChartDataItem[] }) => (
  <View className="mt-4 flex-row flex-wrap justify-center gap-x-4 gap-y-2">
    {data.map((item, index) => (
      <View key={index} className="flex-row items-center gap-2">
        <View
          style={{
            backgroundColor: item.color,
            width: 12,
            height: 12,
            borderRadius: 6,
          }}
        />
        <Text className="text-foreground text-xs">
          {item.label}: {item.value}
        </Text>
      </View>
    ))}
  </View>
);

interface UIChartProps {
  chartType: "pie" | "bar" | "line";
  title?: string;
  data: ChartDataPoint[];
}

export function UIChart({ chartType, title, data }: UIChartProps) {
  const { getColor } = useThemeColors();
  // Map data to chart library format with guaranteed colors
  const chartData: ChartDataItem[] = data.map((point, index) => ({
    value: point.value,
    label: point.label,
    color:
      point.color ??
      getColor(CHART_COLORS[index % CHART_COLORS.length] ?? "chart-1"),
    text: point.label,
  }));

  const renderChart = () => {
    switch (chartType) {
      case "pie":
        return (
          <View className="items-center">
            <PieChart
              data={chartData.map((item) => ({
                value: item.value,
                color: item.color,
                text: String(item.value),
              }))}
              donut
              innerRadius={40}
              radius={80}
              showText
              textColor={getColor("muted")}
              textSize={10}
              backgroundColor={getColor("background")}
              focusOnPress
              centerLabelComponent={() => (
                <Text className="text-foreground text-xs font-medium">
                  Total
                </Text>
              )}
            />
            <ChartLegend data={chartData} />
          </View>
        );

      case "bar":
        return (
          <View className="items-center">
            <BarChart
              data={chartData.map((item) => ({
                value: item.value,
                label: item.label,
                frontColor: item.color,
                topLabelComponent: () => (
                  <Text className="text-foreground text-xs">{item.value}</Text>
                ),
              }))}
              barWidth={32}
              barBorderRadius={4}
              hideRules
              noOfSections={4}
              maxValue={Math.max(...chartData.map((d) => d.value)) * 1.2}
              width={280}
              height={180}
            />
            <ChartLegend data={chartData} />
          </View>
        );

      case "line":
        return (
          <View className="items-center overflow-hidden">
            <LineChart
              data={chartData.map((item) => ({
                value: item.value,
                label: item.label,
                dataPointLabelComponent: () => (
                  <Text className="text-foreground w-full text-xs text-nowrap">
                    {`${item.label}: ${item.value}`}
                  </Text>
                ),
                dataPointLabelWidth: 100,
                dataPointLabelShiftY: -10,
              }))}
              thickness={2}
              dataPointsColor={getColor(CHART_COLORS[0])}
              focusedDataPointColor={getColor("primary")}
              xAxisColor={getColor("muted")}
              yAxisColor={getColor("muted")}
              xAxisIndicesColor={getColor("muted")}
              yAxisIndicesColor={getColor("muted")}
              xAxisLabelTextStyle={{ color: getColor("foreground") }}
              yAxisTextStyle={{ color: getColor("foreground") }}
              textColor1={getColor("chart-1")}
              textColor2={getColor("chart-2")}
              textColor3={getColor("chart-3")}
              textColor4={getColor("chart-4")}
              textColor5={getColor("chart-5")}
              color1={getColor("chart-1")}
              color2={getColor("chart-2")}
              color3={getColor("chart-3")}
              color4={getColor("chart-4")}
              color5={getColor("chart-5")}
              curved
              hideRules
              maxValue={Math.max(...chartData.map((d) => d.value)) * 1.2}
              focusEnabled
              showDataPointLabelOnFocus
            />
          </View>
        );
    }
  };

  return (
    <Card className="my-2">
      {title && (
        <CardHeader className="pb-2">
          <View className="flex-row items-center gap-2">
            <Icon name="chart-bar" size={16} color="foreground" />
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </View>
        </CardHeader>
      )}
      <CardContent className={title ? "pt-0" : ""}>{renderChart()}</CardContent>
    </Card>
  );
}
