import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import type { useExpenseFilters } from "@flatsby/api/hooks/useExpenseFilters";
import type { ExpenseCategoryGroup } from "@flatsby/validators/expenses/categories";
import type { PersonMember } from "@flatsby/validators/expenses/formatting";
import type { MemberRole } from "@flatsby/validators/expenses/list-filter";
import type { ComponentRef, ReactNode } from "react";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import { localDate } from "@flatsby/validators/calendar";
import {
  expenseCategoryGroups,
  groupIconSubcategory,
} from "@flatsby/validators/expenses/categories";
import { memberPerson } from "@flatsby/validators/expenses/formatting";
import {
  datePresets,
  dayRangeLabel,
  describeDayRange,
  filterChipLabels,
  memberRoles,
  presetRange,
} from "@flatsby/validators/expenses/list-filter";

import type { DayRangeDraft } from "./DayRangeGrid";
import { Button } from "~/lib/ui/button";
import { Chip } from "~/lib/ui/chip";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Segmented } from "~/lib/ui/segmented";
import { SheetModal } from "~/lib/ui/sheet-modal";
import { cn, useThemeColors } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { e2eAccessibilityOverride } from "~/utils/e2e";
import { DayRangeGrid, draftRange, nextDraft } from "./DayRangeGrid";
import { getExpenseCategoryData } from "./ExpenseCategoryConfig";
import { MemberAvatar } from "./MemberAvatar";

const SNAP_POINTS = ["60%", "90%"];

type SheetView = "member" | "category" | "range" | "grid";

type FilterMember = PersonMember & { id: number };

interface ExpenseFilterBarProps {
  groupId: number;
  filters: ReturnType<typeof useExpenseFilters>;
  members: FilterMember[];
  meId: number;
  onFocusChange: (focused: boolean) => void;
}

export function ExpenseFilterBar({
  groupId,
  filters,
  members,
  meId,
  onFocusChange,
}: ExpenseFilterBarProps) {
  const t = useTranslations();
  const locale = useLocale();
  const { getColor } = useThemeColors();
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const sheetRef = useRef<BottomSheetModal>(null);
  const [focused, setFocused] = useState(false);
  const [view, setView] = useState<SheetView>("member");
  const [draft, setDraft] = useState<DayRangeDraft>();
  const today = localDate();
  const { choice } = filters;

  const { data: formerData } = useQuery(
    trpc.expense.getFormerMembers.queryOptions({ groupId }),
  );
  const formerMembers = formerData?.success ? formerData.data : [];
  const labels = filterChipLabels(
    choice,
    [...members, ...formerMembers],
    today,
    locale,
    t,
  );

  const focus = (next: boolean) => {
    setFocused(next);
    onFocusChange(next);
  };

  const open = (next: SheetView) => {
    inputRef.current?.blur();
    setView(next);
    sheetRef.current?.present();
  };

  // iOS animates the sheet out for a while; let the new check paint first
  const chooseAndClose = (run: () => void) => {
    run();
    requestAnimationFrame(() => sheetRef.current?.dismiss());
  };

  const memberOption = (member: FilterMember) => (
    <Option
      key={member.id}
      testID={`expense-filter-person-${member.id}`}
      selected={choice.memberId === member.id}
      icon={<MemberAvatar person={memberPerson(member)} className="size-8" />}
      onPress={() =>
        chooseAndClose(() => filters.choose({ memberId: member.id }))
      }
    >
      {member.user.name}
      {member.id === meId && (
        <Text className="text-muted-foreground text-sm">
          {` ${t("expenses.filter.you")}`}
        </Text>
      )}
    </Option>
  );

  return (
    <View>
      <View className="flex-row items-center gap-3">
        <View className="bg-muted h-10 flex-1 flex-row items-center gap-2 rounded-lg px-3">
          <Icon name="search" size={16} color="muted-foreground" />
          <TextInput
            ref={inputRef}
            testID="expense-search-input"
            value={filters.search}
            onChangeText={filters.setSearch}
            onFocus={() => focus(true)}
            onBlur={() => focus(false)}
            placeholder={t("expenses.filter.searchPlaceholder")}
            placeholderTextColor={getColor("muted-foreground")}
            returnKeyType="search"
            autoCorrect={false}
            className="text-foreground flex-1 py-0 text-base"
          />
          {filters.search !== "" && (
            <Pressable
              testID="expense-search-clear"
              accessibilityLabel={t("expenses.filter.clearSearch")}
              hitSlop={8}
              onPress={() => filters.setSearch("")}
            >
              <Icon name="circle-x" size={16} color="muted-foreground" />
            </Pressable>
          )}
        </View>
        {focused && (
          <Pressable
            testID="expense-search-cancel"
            hitSlop={8}
            onPress={() => {
              filters.setSearch("");
              inputRef.current?.blur();
            }}
          >
            <Text className="text-primary text-base">{t("common.cancel")}</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-2 py-3"
      >
        <FilterChip
          testID="expense-filter-person"
          label={labels.member ?? t("expenses.filter.person")}
          active={labels.member !== undefined}
          onPress={() => open("member")}
          onClear={() => filters.clearMember()}
        />
        <FilterChip
          testID="expense-filter-category"
          label={labels.category ?? t("expenses.filter.category")}
          active={choice.category !== undefined}
          onPress={() => open("category")}
          onClear={() => filters.choose({ category: undefined })}
        />
        <FilterChip
          testID="expense-filter-range"
          label={labels.range ?? t("expenses.filter.range")}
          active={choice.range !== undefined}
          onPress={() => open("range")}
          onClear={() => filters.choose({ range: undefined })}
        />
        {filters.hasChoice && (
          <Pressable
            testID="expense-filter-clear"
            onPress={filters.clearChoice}
            className="justify-center px-1"
          >
            <Text className="text-primary text-sm font-medium">
              {t("expenses.filter.clearAll")}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <SheetModal ref={sheetRef} snapPoints={SNAP_POINTS}>
        {view === "grid" ? (
          <View className="flex-1 pb-6">
            <Pressable
              testID="expense-range-back"
              onPress={() => setView("range")}
              className="flex-row items-center gap-1 px-4 pb-3"
            >
              <Icon name="chevron-left" size={18} color="primary" />
              <Text className="text-primary text-base">
                {t("expenses.filter.range")}
              </Text>
            </Pressable>
            <DayRangeGrid
              today={today}
              draft={draft}
              onPick={(day) => setDraft(nextDraft(draft, day))}
            />
            <View className="border-border flex-row items-center gap-3 border-t px-4 pt-3">
              <Text
                className={cn(
                  "flex-1 text-sm",
                  draft?.to === undefined
                    ? "text-muted-foreground"
                    : "text-foreground font-semibold",
                )}
              >
                {!draft
                  ? t("expenses.filter.pickStart")
                  : draft.to === undefined
                    ? t("expenses.filter.pickEnd", {
                        from: describeDayRange(
                          draftRange(draft),
                          today,
                          locale,
                          t,
                        ),
                      })
                    : describeDayRange(draftRange(draft), today, locale, t)}
              </Text>
              <Button
                testID="expense-range-apply"
                title={t("expenses.filter.apply")}
                size="sm"
                disabled={!draft}
                onPress={() =>
                  draft &&
                  chooseAndClose(() =>
                    filters.choose({ range: draftRange(draft) }),
                  )
                }
              />
            </View>
          </View>
        ) : (
          <ScrollView
            contentContainerClassName="pb-10"
            showsVerticalScrollIndicator={false}
          >
            {view === "member" && (
              <>
                <SheetTitle>{t("expenses.filter.person")}</SheetTitle>
                <View className="px-4 pb-2">
                  <Segmented<MemberRole>
                    options={memberRoles.map((role) => ({
                      value: role,
                      label: t(`expenses.filter.roles.${role}`),
                      testID: `expense-filter-role-${role}`,
                    }))}
                    value={choice.memberRole}
                    onChange={(memberRole) => filters.choose({ memberRole })}
                  />
                </View>
                <Option
                  testID="expense-filter-person-all"
                  selected={choice.memberId === undefined}
                  onPress={() => chooseAndClose(() => filters.clearMember())}
                >
                  {t("expenses.filter.all")}
                </Option>
                {members.map(memberOption)}
                {formerMembers.length > 0 && (
                  <SectionLabel>
                    {t("expenses.filter.formerMembers")}
                  </SectionLabel>
                )}
                {formerMembers.map(memberOption)}
              </>
            )}

            {view === "category" && (
              <>
                <SheetTitle>{t("expenses.filter.category")}</SheetTitle>
                <Option
                  testID="expense-filter-category-all"
                  selected={choice.category === undefined}
                  onPress={() =>
                    chooseAndClose(() =>
                      filters.choose({ category: undefined }),
                    )
                  }
                >
                  {t("expenses.filter.all")}
                </Option>
                {expenseCategoryGroups.map((group) => (
                  <CategoryOption
                    key={group}
                    group={group}
                    selected={choice.category === group}
                    onPress={() =>
                      chooseAndClose(() => filters.choose({ category: group }))
                    }
                  />
                ))}
              </>
            )}

            {view === "range" && (
              <>
                <SheetTitle>{t("expenses.filter.range")}</SheetTitle>
                <Option
                  testID="expense-filter-range-all"
                  selected={choice.range === undefined}
                  onPress={() =>
                    chooseAndClose(() => filters.choose({ range: undefined }))
                  }
                >
                  {t("expenses.filter.allTime")}
                </Option>
                {datePresets.map((preset) => {
                  const range = presetRange(preset, today);
                  return (
                    <Option
                      key={preset}
                      testID={`expense-filter-range-${preset}`}
                      selected={choice.range?.preset === preset}
                      detail={describeDayRange(range, today, locale, t)}
                      onPress={() =>
                        chooseAndClose(() => filters.choose({ range }))
                      }
                    >
                      {dayRangeLabel(range, today, locale, t)}
                    </Option>
                  );
                })}
                <SectionLabel>{t("expenses.filter.customRange")}</SectionLabel>
                <Option
                  testID="expense-filter-range-custom"
                  selected={filters.customRange !== undefined}
                  chevron
                  onPress={() => {
                    setDraft(filters.customRange);
                    setView("grid");
                    sheetRef.current?.expand();
                  }}
                >
                  {filters.customRange
                    ? labels.range
                    : t("expenses.filter.pickRange")}
                </Option>
              </>
            )}
          </ScrollView>
        )}
      </SheetModal>
    </View>
  );
}

function FilterChip({
  testID,
  label,
  active,
  onPress,
  onClear,
}: {
  testID: string;
  label: string;
  active: boolean;
  onPress: () => void;
  onClear: () => void;
}) {
  return (
    <Chip
      testID={testID}
      label={label}
      active={active}
      onPress={onPress}
      trailing={
        active ? (
          <Pressable testID={`${testID}-clear`} hitSlop={10} onPress={onClear}>
            <Icon name="x" size={14} color="primary-foreground" />
          </Pressable>
        ) : (
          <Icon name="chevron-down" size={14} color="muted-foreground" />
        )
      }
    />
  );
}

function SheetTitle({ children }: { children: ReactNode }) {
  return (
    <Text className="text-foreground px-4 pb-3 text-xl font-extrabold">
      {children}
    </Text>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="text-muted-foreground px-4 pt-4 pb-1 text-xs font-bold uppercase">
      {children}
    </Text>
  );
}

function Option({
  testID,
  selected,
  icon,
  detail,
  chevron,
  onPress,
  children,
}: {
  testID: string;
  selected: boolean;
  icon?: ReactNode;
  detail?: string;
  chevron?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      testID={testID}
      accessible={e2eAccessibilityOverride()}
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 px-4 py-3",
        selected ? "bg-muted" : "active:bg-muted",
      )}
    >
      {icon}
      <Text className="text-foreground flex-1 text-base">{children}</Text>
      {detail !== undefined && !selected && (
        <Text className="text-muted-foreground text-sm">{detail}</Text>
      )}
      {chevron && !selected && (
        <Icon name="chevron-right" size={18} color="muted-foreground" />
      )}
      {selected && <Icon name="check" size={18} color="foreground" />}
    </Pressable>
  );
}

function CategoryOption({
  group,
  selected,
  onPress,
}: {
  group: ExpenseCategoryGroup;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTranslations();
  const category = getExpenseCategoryData({
    subcategoryId: groupIconSubcategory(group),
  });
  return (
    <Option
      testID={`expense-filter-category-${group}`}
      selected={selected}
      icon={
        <View
          className={cn(
            "size-8 items-center justify-center rounded-lg",
            category.bgColor,
          )}
        >
          {category.icon}
        </View>
      }
      onPress={onPress}
    >
      {t(`expenseCategories.groups.${group}`)}
    </Option>
  );
}
