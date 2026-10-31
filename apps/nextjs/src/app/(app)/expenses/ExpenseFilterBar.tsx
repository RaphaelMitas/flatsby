"use client";

import type { useExpenseFilters } from "@flatsby/api/hooks/useExpenseFilters";
import type { ExpenseCategoryGroup } from "@flatsby/validators/expenses/categories";
import type { PersonMember } from "@flatsby/validators/expenses/formatting";
import type { DayRange } from "@flatsby/validators/expenses/list-filter";
import type { ReactNode } from "react";
import type { DateRange } from "react-day-picker";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import { Calendar } from "@flatsby/ui/calendar";
import { getExpenseCategoryData } from "@flatsby/ui/categories/expense-categories";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@flatsby/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@flatsby/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@flatsby/ui/tabs";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import {
  localDate,
  monthOf,
  pickerDate,
  shiftMonth,
} from "@flatsby/validators/calendar";
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

import { useTRPC } from "~/trpc/react";

type FilterMenu = "member" | "category" | "range";

type FilterMember = PersonMember & { id: number };

interface ExpenseFilterBarProps {
  groupId: number;
  filters: ReturnType<typeof useExpenseFilters>;
  members: FilterMember[];
  meId: number;
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export function ExpenseFilterBar({
  groupId,
  filters,
  members,
  meId,
}: ExpenseFilterBarProps) {
  const trpc = useTRPC();
  const t = useTranslations();
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState<FilterMenu | null>(null);
  const [draft, setDraft] = useState<DateRange>();
  const today = localDate();
  const { choice } = filters;

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== "/" || isTyping(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

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

  const choose = (patch: Parameters<typeof filters.choose>[0]) => {
    filters.choose(patch);
    setMenu(null);
  };

  const menuProps = (name: FilterMenu) => ({
    open: menu === name,
    onOpenChange: (open: boolean) => {
      if (open && name === "range") {
        const custom = filters.customRange;
        setDraft(
          custom && {
            from: pickerDate(custom.from),
            to: pickerDate(custom.to),
          },
        );
      }
      setMenu(open ? name : null);
    },
  });

  const memberOption = (member: FilterMember) => (
    <Option
      key={member.id}
      testId={`expense-filter-person-${member.id}`}
      selected={choice.memberId === member.id}
      icon={<UserAvatar {...memberPerson(member)} size="sm" />}
      onSelect={() => choose({ memberId: member.id })}
    >
      {member.user.name}
      {member.id === meId && (
        <span className="text-muted-foreground">
          {` ${t("expenses.filter.you")}`}
        </span>
      )}
    </Option>
  );
  const draftRange =
    draft?.from &&
    ({
      from: localDate(draft.from),
      to: localDate(draft.to ?? draft.from),
    } satisfies DayRange);

  return (
    <div className="flex flex-col gap-3 px-4 pt-4">
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          data-testid="expense-search-input"
          value={filters.search}
          onChange={(event) => filters.setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") filters.setSearch("");
          }}
          placeholder={t("expenses.filter.searchPlaceholder")}
          autoComplete="off"
        />
        <InputGroupAddon align="inline-end">
          {filters.search ? (
            <InputGroupButton
              size="icon-xs"
              aria-label={t("expenses.filter.clearSearch")}
              data-testid="expense-search-clear"
              onClick={() => filters.setSearch("")}
            >
              <X />
            </InputGroupButton>
          ) : (
            <kbd className="text-muted-foreground rounded border px-1.5 text-xs">
              /
            </kbd>
          )}
        </InputGroupAddon>
      </InputGroup>

      <div className="flex flex-wrap items-center gap-2">
        <Popover {...menuProps("member")}>
          <Chip
            testId="expense-filter-person"
            label={labels.member ?? t("expenses.filter.person")}
            active={labels.member !== undefined}
            onClear={() => filters.clearMember()}
          />
          <PopoverContent align="start" className="w-64 p-1">
            <Tabs
              value={choice.memberRole}
              onValueChange={(value) => {
                const memberRole = memberRoles.find((role) => role === value);
                if (memberRole) filters.choose({ memberRole });
              }}
              className="mb-1"
            >
              <TabsList className="w-full">
                {memberRoles.map((role) => (
                  <TabsTrigger
                    key={role}
                    value={role}
                    data-testid={`expense-filter-role-${role}`}
                  >
                    {t(`expenses.filter.roles.${role}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Option
              testId="expense-filter-person-all"
              selected={choice.memberId === undefined}
              onSelect={() =>
                choose({ memberId: undefined, memberRole: "any" })
              }
            >
              {t("expenses.filter.all")}
            </Option>
            {members.map(memberOption)}
            {formerMembers.length > 0 && (
              <SectionLabel>{t("expenses.filter.formerMembers")}</SectionLabel>
            )}
            {formerMembers.map(memberOption)}
          </PopoverContent>
        </Popover>

        <Popover {...menuProps("category")}>
          <Chip
            testId="expense-filter-category"
            label={labels.category ?? t("expenses.filter.category")}
            active={choice.category !== undefined}
            onClear={() => filters.choose({ category: undefined })}
          />
          <PopoverContent
            align="start"
            className="max-h-96 w-64 overflow-y-auto p-1"
          >
            <Option
              testId="expense-filter-category-all"
              selected={choice.category === undefined}
              onSelect={() => choose({ category: undefined })}
            >
              {t("expenses.filter.all")}
            </Option>
            {expenseCategoryGroups.map((group) => (
              <CategoryOption
                key={group}
                group={group}
                selected={choice.category === group}
                onSelect={() => choose({ category: group })}
              />
            ))}
          </PopoverContent>
        </Popover>

        <Popover {...menuProps("range")}>
          <Chip
            testId="expense-filter-range"
            label={labels.range ?? t("expenses.filter.range")}
            active={choice.range !== undefined}
            onClear={() => filters.choose({ range: undefined })}
          />
          <PopoverContent align="start" className="flex w-auto p-0">
            <div className="flex w-44 flex-col border-r p-1">
              <Option
                testId="expense-filter-range-all"
                selected={choice.range === undefined}
                onSelect={() => choose({ range: undefined })}
              >
                {t("expenses.filter.allTime")}
              </Option>
              {datePresets.map((preset) => {
                const range = presetRange(preset, today);
                return (
                  <Option
                    key={preset}
                    testId={`expense-filter-range-${preset}`}
                    selected={choice.range?.preset === preset}
                    onSelect={() => choose({ range })}
                  >
                    {dayRangeLabel(range, today, locale, t)}
                  </Option>
                );
              })}
            </div>
            <div className="flex flex-col">
              <Calendar
                mode="range"
                numberOfMonths={2}
                weekStartsOn={1}
                selected={draft}
                onSelect={setDraft}
                defaultMonth={pickerDate(
                  `${shiftMonth(monthOf(today), -1)}-01`,
                )}
                endMonth={pickerDate(today)}
                disabled={{ after: pickerDate(today) }}
              />
              <div className="flex items-center justify-between gap-3 border-t p-3">
                <span
                  className={cn(
                    "text-sm",
                    draftRange ? "font-semibold" : "text-muted-foreground",
                  )}
                >
                  {draftRange
                    ? describeDayRange(draftRange, today, locale, t)
                    : t("expenses.filter.pickStart")}
                </span>
                <Button
                  size="sm"
                  data-testid="expense-range-apply"
                  disabled={!draftRange}
                  onClick={() => draftRange && choose({ range: draftRange })}
                >
                  {t("expenses.filter.apply")}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {filters.hasChoice && (
          <Button
            variant="link"
            size="sm"
            className="px-1"
            data-testid="expense-filter-clear"
            onClick={filters.clearChoice}
          >
            {t("expenses.filter.clearAll")}
          </Button>
        )}
      </div>
    </div>
  );
}

function Chip({
  testId,
  label,
  active,
  onClear,
}: {
  testId: string;
  label: string;
  active: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center">
      <PopoverTrigger asChild>
        <Button
          variant={active ? "default" : "outline"}
          size="sm"
          data-testid={testId}
          className={cn("rounded-full", active && "rounded-r-none pr-2")}
        >
          {label}
          {!active && <ChevronDown />}
        </Button>
      </PopoverTrigger>
      {active && (
        <Button
          size="sm"
          aria-label={label}
          data-testid={`${testId}-clear`}
          className="rounded-l-none rounded-r-full pl-1"
          onClick={onClear}
        >
          <X />
        </Button>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground px-2 pt-2 pb-1 text-xs font-semibold uppercase">
      {children}
    </div>
  );
}

function Option({
  testId,
  selected,
  icon,
  onSelect,
  children,
}: {
  testId: string;
  selected: boolean;
  icon?: ReactNode;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onSelect}
      className={cn(
        "hover:bg-muted flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
        selected && "bg-muted",
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {selected && <Check className="h-4 w-4" />}
    </button>
  );
}

function CategoryOption({
  group,
  selected,
  onSelect,
}: {
  group: ExpenseCategoryGroup;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations();
  const category = getExpenseCategoryData(groupIconSubcategory(group));
  return (
    <Option
      testId={`expense-filter-category-${group}`}
      selected={selected}
      icon={
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md",
            category.colorClasses.bg,
          )}
        >
          <category.icon
            className={cn("h-3.5 w-3.5", category.colorClasses.base)}
          />
        </span>
      }
      onSelect={onSelect}
    >
      {t(`expenseCategories.groups.${group}`)}
    </Option>
  );
}
