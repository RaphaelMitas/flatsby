import type { DueChore } from "@flatsby/validators/calendar";
import type { PersonLookup } from "@flatsby/validators/expenses/formatting";
import type { DebtEntry } from "@flatsby/validators/expenses/types";
import { Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutLeft,
  LinearTransition,
} from "react-native-reanimated";
import { useLocale, useTranslations } from "use-intl";

import {
  categoryBorderColorMap,
  categoryFillColorMap,
} from "@flatsby/validators/expenses/category-colors";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import type { CatPose } from "./HomeCat";
import { MemberAvatar } from "~/components/expenses/MemberAvatar";
import { Button } from "~/lib/ui/button";
import { cn } from "~/lib/utils";
import { CAT_SIZE } from "../dashboard/useCatTap";
import { CatOverlay, HomeCat } from "./HomeCat";

export type Nudge =
  | { kind: "chore"; entry: DueChore; overdue: boolean; more: number }
  | { kind: "debt"; debt: DebtEntry; more: number };

const POSES: CatPose[] = ["asleep", "peeking", "sitting"];

export function ForYouCard({
  nudges,
  person,
  speech,
  stretchKey,
  onTick,
  onSettle,
  onCatPress,
}: {
  nudges: Nudge[];
  person: PersonLookup;
  speech: string | null;
  stretchKey: number;
  onTick: (entry: DueChore) => void;
  onSettle: (debt: DebtEntry) => void;
  onCatPress: (pose: CatPose) => void;
}) {
  const t = useTranslations("home.new");
  const pose = POSES[Math.min(nudges.length, 2)] ?? "asleep";

  return (
    <View>
      <HomeCat
        pose={pose}
        stretchKey={stretchKey}
        onPress={() => onCatPress(pose)}
      />
      <Animated.View
        layout={LinearTransition}
        testID="home-for-you"
        style={{ marginTop: CAT_SIZE }}
        className="bg-card border-border rounded-3xl border px-3.5 py-1 shadow-sm"
      >
        {nudges.length === 0 ? (
          <Animated.View entering={FadeIn.delay(200)} className="py-3.5">
            <Text className="text-foreground text-lg font-bold">
              {t("nothingNeedsYou")}
            </Text>
            <Text className="text-muted-foreground mt-0.5 text-sm">
              {t("wakeYou")}
            </Text>
          </Animated.View>
        ) : (
          nudges.map((nudge, index) => (
            <Animated.View
              key={
                nudge.kind === "chore"
                  ? `chore-${nudge.entry.item.id}-${nudge.entry.occurrence.date}`
                  : `debt-${nudge.debt.toGroupMemberId}-${nudge.debt.currency}`
              }
              entering={FadeInDown}
              exiting={FadeOutLeft}
              layout={LinearTransition}
              className={cn(index > 0 && "border-border border-t")}
            >
              {nudge.kind === "chore" ? (
                <ChoreLine nudge={nudge} onTick={onTick} />
              ) : (
                <DebtLine nudge={nudge} person={person} onSettle={onSettle} />
              )}
            </Animated.View>
          ))
        )}
      </Animated.View>
      <CatOverlay pose={pose} speech={speech} />
    </View>
  );
}

function ChoreLine({
  nudge: { entry, overdue, more },
  onTick,
}: {
  nudge: Extract<Nudge, { kind: "chore" }>;
  onTick: (entry: DueChore) => void;
}) {
  const t = useTranslations();
  const { color, title } = entry.item;

  return (
    <View className="min-h-16 flex-row items-center gap-2.5 py-2">
      <View
        className={cn(
          "mx-2 h-2.5 w-2.5 rounded-full",
          categoryFillColorMap[color],
        )}
      />
      <View className="min-w-0 flex-1">
        <Text
          className={cn(
            "text-sm font-semibold",
            overdue ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {overdue ? t("calendar.overdue") : t("home.new.yourTurn")}
          {more > 0 && ` · ${t("home.new.more", { count: more })}`}
        </Text>
        <Text
          numberOfLines={1}
          className="text-foreground text-xl font-extrabold tracking-tight"
        >
          {title}
        </Text>
      </View>
      <Pressable
        testID={`home-chore-tick-${title}`}
        accessibilityRole="checkbox"
        accessibilityLabel={title}
        accessibilityState={{ checked: false }}
        hitSlop={8}
        onPress={() => onTick(entry)}
        className={cn(
          "h-8 w-8 rounded-full border-2",
          categoryBorderColorMap[color],
        )}
      />
    </View>
  );
}

function DebtLine({
  nudge: { debt, more },
  person,
  onSettle,
}: {
  nudge: Extract<Nudge, { kind: "debt" }>;
  person: PersonLookup;
  onSettle: (debt: DebtEntry) => void;
}) {
  const t = useTranslations("home.new");
  const tDebts = useTranslations("debts");
  const locale = useLocale();
  const to = person(debt.toGroupMemberId);

  return (
    <View className="min-h-16 flex-row items-center gap-2.5 py-2">
      <MemberAvatar person={to} className="h-7 w-7" textClassName="text-xs" />
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className="text-muted-foreground text-sm font-semibold"
        >
          {t("youOwe", { name: to.name })}
          {more > 0 && ` · ${t("more", { count: more })}`}
        </Text>
        <Text className="text-foreground text-xl font-extrabold tracking-tight">
          {formatCurrencyFromCents({
            cents: debt.amountInCents,
            currency: debt.currency,
            locale,
          })}
        </Text>
      </View>
      <Button
        testID="home-settle-up"
        size="sm"
        className="rounded-full"
        title={tDebts("settleUp")}
        onPress={() => onSettle(debt)}
      />
    </View>
  );
}
