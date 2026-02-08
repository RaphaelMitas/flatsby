import type { TableColumn } from "@flatsby/validators/chat/tools";
import { ScrollView, Text, View } from "react-native";

import { Card, CardContent, CardHeader, CardTitle } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";

interface UITableProps {
  title?: string;
  columns: TableColumn[];
  rows: Record<string, string | number>[];
}

export function UITable({ title, columns, rows }: UITableProps) {
  return (
    <Card className="my-2">
      {title && (
        <CardHeader className="pb-2">
          <View className="flex-row items-center gap-2">
            <Icon name="table-2" size={16} color="foreground" />
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </View>
        </CardHeader>
      )}
      <CardContent className={title ? "pt-0" : ""}>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            {/* Header */}
            <View className="border-border flex-row border-b pb-2">
              {columns.map((col) => (
                <View key={col.key} className="px-2">
                  <Text className="text-muted-foreground text-sm font-medium">
                    {col.label}
                  </Text>
                </View>
              ))}
            </View>
            {/* Rows */}
            {rows.map((row, rowIndex) => (
              <View
                key={rowIndex}
                className="border-border flex-row border-b py-2 last:border-b-0"
              >
                {columns.map((col) => (
                  <View key={col.key} className="px-2">
                    <Text className="text-foreground text-sm">
                      {row[col.key] ?? ""}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </CardContent>
    </Card>
  );
}
