import { Text, View } from "react-native";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import { Badge } from "~/lib/ui/badge";
import { Card, CardContent } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { getExpenseCategoryData } from "../expenses/ExpenseCategoryConfig";

export interface ExpenseDisplayProps {
  amountInCents: number;
  currency: string;
  description?: string | null;
  paidByName: string;
  paidByImage?: string | null;
  expenseDate: Date;
  splitMethod?: string;
  splitCount?: number;
  subcategory: string;
  fromName?: string;
  fromImage?: string | null;
  isSelected?: boolean;
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
  subcategory,
  fromName,
  fromImage,
  isSelected,
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
  const categoryData = getExpenseCategoryData({ subcategoryId: subcategory });

  return (
    <Card className={isSelected ? "border-primary border-2" : undefined}>
      <CardContent className="gap-3 p-4">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-foreground text-2xl font-bold">
            {formattedAmount}
          </Text>
          {isSettlement ? (
            <Badge variant="secondary">
              <Icon name="handshake" size={12} color="secondary-foreground" />
              <Text className="text-secondary-foreground text-xs font-medium">
                Settlement
              </Text>
            </Badge>
          ) : (
            <Badge
              className={`${categoryData.bgColor} ${categoryData.borderColor}`}
            >
              {categoryData.icon}
              <Text className={`text-xs font-medium ${categoryData.color}`}>
                {categoryData.name}
              </Text>
            </Badge>
          )}
        </View>

        {description && (
          <Text
            className="text-foreground text-lg font-medium"
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

          <View className="flex-row items-center gap-2">
            {!isSettlement && splitCount != null && (
              <>
                <Icon name="users" size={16} color="muted-foreground" />
                <Text className="text-muted-foreground text-sm">
                  Split between {splitCount}{" "}
                  {splitCount === 1 ? "person" : "people"}
                </Text>
                <Text className="text-muted-foreground text-sm">·</Text>
              </>
            )}
            <Icon name="calendar" size={16} color="muted-foreground" />
            <Text className="text-muted-foreground text-sm">
              {formattedDate}
            </Text>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
