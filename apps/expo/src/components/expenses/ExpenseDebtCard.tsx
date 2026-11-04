import { Pressable, Text, View } from "react-native";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import { debtsFor } from "@flatsby/validators/expenses/debt";
import {
  debtHero,
  personLookup,
} from "@flatsby/validators/expenses/formatting";

import { Card } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { DebtHero } from "./DebtHero";
import { MemberAvatar } from "./MemberAvatar";

interface ExpenseDebtCardProps {
  groupId: number;
  onPress: () => void;
}

export function ExpenseDebtCard({ groupId, onPress }: ExpenseDebtCardProps) {
  const t = useTranslations();
  const locale = useLocale();

  const { data: debtData } = useSuspenseQuery(
    trpc.expense.getDebtSummary.queryOptions({ groupId }),
  );
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  if (!debtData.success || !groupData.success) return null;

  const summary = debtData.data;
  const meId = groupData.data.thisGroupMember.id;
  const person = personLookup(groupData.data.groupMembers, meId, t);
  const counterparts = debtsFor(summary, meId, "direct", t);
  const hero = debtHero(summary, meId, t, locale);
  const label =
    counterparts.length === 0
      ? t("debts.allSquare")
      : [hero.label, ...hero.amounts.map(({ text }) => text)].join(", ");

  return (
    <Pressable
      testID="expense-debt-card"
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="mb-2"
    >
      <Card className="flex-row items-center gap-3 p-4">
        {counterparts.length === 0 ? (
          <>
            <View className="bg-success/10 h-9 w-9 items-center justify-center rounded-full">
              <Icon name="check" size={18} color="success" />
            </View>
            <Text className="text-foreground flex-1 font-semibold">
              {t("debts.allSquare")}
            </Text>
          </>
        ) : (
          <>
            <DebtHero hero={hero} className="flex-1" />
            <View className="flex-row">
              {counterparts.slice(0, 3).map(({ groupMemberId }, index) => (
                <MemberAvatar
                  key={groupMemberId}
                  person={person(groupMemberId)}
                  className={cn(
                    "border-card h-7 w-7 border-2",
                    index > 0 && "-ml-2",
                  )}
                  textClassName="text-xs"
                />
              ))}
            </View>
          </>
        )}
        <Icon name="chevron-right" size={18} color="muted-foreground" />
      </Card>
    </Pressable>
  );
}
