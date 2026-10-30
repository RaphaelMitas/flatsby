import type { DebtPerson } from "@flatsby/validators/expenses/formatting";
import { Text, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { formatExpenseDateShort } from "@flatsby/validators/expenses/formatting";

import { Badge } from "~/lib/ui/badge";
import { Card, CardContent } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { ExpenseCategoryBadge } from "~/lib/ui/expense-category-badge";
import { MemberAvatar } from "./MemberAvatar";

export interface ExpenseDisplayProps {
  amounts: { amount: string; paid?: string };
  isNotConverted?: boolean;
  description?: string | null;
  paidBy: DebtPerson;
  expenseDate: Date;
  splitMethod?: string;
  splitCount?: number;
  subcategory: string;
  from?: DebtPerson;
  isSelected?: boolean;
}

export function ExpenseDisplay({
  amounts,
  isNotConverted,
  description,
  paidBy,
  expenseDate,
  splitMethod,
  splitCount,
  subcategory,
  from,
  isSelected,
}: ExpenseDisplayProps) {
  const t = useTranslations("expenses");
  const locale = useLocale();
  const subline =
    amounts.paid ?? (isNotConverted ? t("conversion.notConverted") : null);
  const formattedDate = formatExpenseDateShort(expenseDate, locale);

  const isSettlement = splitMethod === "settlement";

  return (
    <Card className={isSelected ? "border-primary border-2" : undefined}>
      <CardContent className="gap-3 p-4">
        <View className="flex-row flex-wrap items-center gap-2">
          <View>
            <Text className="text-foreground text-2xl font-bold">
              {amounts.amount}
            </Text>
            {subline && (
              <Text className="text-muted-foreground text-sm">{subline}</Text>
            )}
          </View>
          {isSettlement ? (
            <Badge variant="secondary">
              <Icon name="handshake" size={12} color="secondary-foreground" />
              <Text className="text-secondary-foreground text-xs font-medium">
                {t("settlement")}
              </Text>
            </Badge>
          ) : (
            <ExpenseCategoryBadge subcategoryId={subcategory} />
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
            {isSettlement && from && (
              <>
                <MemberAvatar
                  person={from}
                  className="h-5 w-5"
                  textClassName="text-xs"
                />
                <Text className="text-muted-foreground text-sm">
                  {from.name}
                </Text>
                <Icon name="arrow-right" size={16} color="muted-foreground" />
              </>
            )}
            <MemberAvatar
              person={paidBy}
              className="h-5 w-5"
              textClassName="text-xs"
            />
            <Text className="text-muted-foreground text-sm" numberOfLines={1}>
              {isSettlement ? paidBy.name : t("paidBy", { name: paidBy.name })}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            {!isSettlement && splitCount != null && (
              <>
                <Icon name="users" size={16} color="muted-foreground" />
                <Text className="text-muted-foreground text-sm">
                  {t("splitBetween", { count: splitCount })}
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
