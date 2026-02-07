"use client";

import type { ChartConfig } from "@flatsby/ui/chart";
import type { ChartDataPoint } from "@flatsby/validators/chat/tools";
import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@flatsby/ui/chart";

// Default color palette for charts - using CSS variables directly
// Note: --chart-* variables already contain hsl() values, so don't wrap in hsl()
const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface UIChartProps {
  chartType: "pie" | "bar" | "line";
  title?: string;
  data: ChartDataPoint[];
}

export function UIChart({ chartType, title, data }: UIChartProps) {
  const chartData = data.map((point, index) => ({
    ...point,
    fill: point.color ?? COLORS[index % COLORS.length],
  }));

  // Build chart config from data
  const chartConfig = chartData.reduce<ChartConfig>((acc, item, index) => {
    acc[`item-${index}`] = {
      label: item.label,
      color: item.fill,
    };
    return acc;
  }, {});

  return (
    <Card className="my-2 w-full max-w-md">
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="size-4" />
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "pt-0" : ""}>
        {chartType === "pie" ? (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[200px]"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        ) : chartType === "bar" ? (
          <ChartContainer config={chartConfig} className="max-h-[200px]">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 0, right: 40 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                tickLine={false}
                axisLine={false}
                width={100}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
              <Bar dataKey="value" radius={4}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <ChartContainer config={chartConfig} className="max-h-[200px]">
            <LineChart
              data={chartData}
              margin={{ left: 0, right: 12, top: 12, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
              <Line
                dataKey="value"
                type="monotone"
                stroke={COLORS[0]}
                strokeWidth={2}
                dot={{ fill: COLORS[0] }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
