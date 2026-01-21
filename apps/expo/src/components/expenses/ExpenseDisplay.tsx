import { Text, View } from "react-native";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import { Card, CardContent } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";

export interface ExpenseDisplayProps {
  amountInCents: number;
  currency: string;
  description?: string | null;
  paidByName: string;
  paidByImage?: string | null;
  expenseDate: Date;
  splitMethod?: string;
  splitCount?: number;
  category?: string | null;
  fromName?: string;
  fromImage?: string | null;
}

export function ExpenseDisplay({
  amountInCents,
  currency,
  description,
  paidByName,
  paidByImage,
  expenseDate,
  splitMethod,
  splitCount,
  category,
  fromName,
  fromImage,
}: ExpenseDisplayProps) {
  const formattedAmount = formatCurrencyFromCents({
    cents: amountInCents,
    currency,
  });

  const formattedDate = expenseDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      expenseDate.getFullYear() !== new Date().getFullYear()
        ? "numeric"
        : undefined,
  });

  const isSettlement = splitMethod === "settlement";

  return (
    <Card>
      <CardContent className="gap-3 p-4">
        <View className="flex-row items-center gap-2">
          <Text className="text-foreground text-2xl font-bold">
            {formattedAmount}
          </Text>
          {isSettlement && (
            <View className="bg-muted-foreground/20 rounded px-2 py-1">
              <Text className="text-muted-foreground text-xs">Settlement</Text>
            </View>
          )}
        </View>

        {description && (
          <Text
            className="text-foreground text-sm font-medium"
            numberOfLines={2}
          >
            {description}
          </Text>
        )}

        <View className="flex-col gap-2">
          <View className="flex-row items-center gap-2">
            {isSettlement && fromName && (
              <>
                <Avatar className="h-5 w-5">
                  {fromImage && <AvatarImage src={fromImage} />}
                  <AvatarFallback className="text-xs">
                    {fromName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Text className="text-muted-foreground text-sm">
                  {fromName}
                </Text>
                <Icon name="arrow-right" size={16} color="muted-foreground" />
              </>
            )}
            <Avatar className="h-5 w-5">
              {paidByImage && <AvatarImage src={paidByImage} />}
              <AvatarFallback className="text-xs">
                {paidByName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Text className="text-muted-foreground text-sm" numberOfLines={1}>
              {isSettlement ? paidByName : `Paid by ${paidByName}`}
            </Text>
          </View>

          {!isSettlement && splitCount != null && (
            <View className="flex-row items-center gap-2">
              <Icon name="users" size={16} color="muted-foreground" />
              <Text className="text-muted-foreground text-sm">
                Split between {splitCount}{" "}
                {splitCount === 1 ? "person" : "people"}
              </Text>
            </View>
          )}

          <View className="flex-row items-center gap-2">
            <Icon name="calendar" size={16} color="muted-foreground" />
            <Text className="text-muted-foreground text-sm">
              {formattedDate}
            </Text>
            {category && (
              <>
                <Text className="text-muted-foreground text-sm">•</Text>
                <Text className="text-muted-foreground text-sm capitalize">
                  {category}
                </Text>
              </>
            )}
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
