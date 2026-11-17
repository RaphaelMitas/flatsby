"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  AlertCircle,
  ArrowLeft,
  CalendarIcon,
  ChevronRight,
  LoaderCircle,
  Tag,
  User,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { failureOf } from "@flatsby/api/resultMutation";
import { cn } from "@flatsby/ui";
import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";
import { Calendar } from "@flatsby/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@flatsby/ui/form";
import { Input } from "@flatsby/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@flatsby/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import {
  describeSplitProblem,
  formatCurrencyFromCents,
  memberPerson,
} from "@flatsby/validators/expenses/formatting";
import { finalizeSplits } from "@flatsby/validators/expenses/split-editing";

import type { UseExpenseFormReturn } from "./useExpenseForm";
import { CurrencyInput } from "~/components/CurrencyInput";
import { CurrencySelect } from "~/components/CurrencySelect";
import { ConversionField } from "./ConversionField";
import { ExpenseCategorySelector } from "./ExpenseCategorySelector";
import { ReceiptScanCard } from "./ReceiptScan";
import { SplitEditor } from "./SplitEditor";

function FormRow({
  Icon,
  title,
  children,
}: {
  Icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <span className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-sm font-medium">{title}</span>
      {children}
    </div>
  );
}

interface ExpenseFormContentProps {
  formState: UseExpenseFormReturn;
}

export function ExpenseFormContent({ formState }: ExpenseFormContentProps) {
  const t = useTranslations();
  const locale = useLocale();
  const {
    form,
    view,
    setView,
    isEditMode,
    splitMethod,
    amountInCents,
    currency,
    split,
    isPending,
    createExpenseMutation,
    updateExpenseMutation,
    onSubmit,
    group,
    allMembers,
    conversion,
    receiptScan,
  } = formState;
  const scanned = receiptScan.justApplied
    ? "ring-primary/40 ring-2"
    : undefined;
  const participants = finalizeSplits(splitMethod, split.splits, amountInCents);
  const splitProblem = describeSplitProblem({
    method: splitMethod,
    ...split,
    currency,
    locale,
  });
  const failure =
    failureOf(createExpenseMutation, t("expenses.genericError")) ??
    failureOf(updateExpenseMutation, t("expenses.genericError"));

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit(values))}
        className="space-y-6"
      >
        <div className="flex items-center gap-2">
          {view === "split" && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setView("details")}
              aria-label={t("common.back")}
              data-testid="split-back"
            >
              <ArrowLeft />
            </Button>
          )}
          <h2
            data-testid="expense-form-title"
            className="text-lg font-semibold"
          >
            {view === "split"
              ? t("expenses.splitTitle")
              : isEditMode
                ? t("expenses.editExpense")
                : t("expenses.addExpense")}
          </h2>
        </div>

        {view === "split" ? (
          <SplitEditor
            form={form}
            groupMembers={allMembers}
            totalAmountCents={amountInCents}
            currency={currency}
            conversion={conversion.fields}
            onDone={() => setView("details")}
          />
        ) : (
          <>
            {!isEditMode && <ReceiptScanCard receiptScan={receiptScan} />}

            <div className="flex flex-col items-center gap-2">
              <FormField
                control={form.control}
                name="amountInCents"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <CurrencyInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0.00"
                        min={1}
                        className={cn(
                          "h-16 text-center text-4xl font-bold md:text-4xl",
                          scanned,
                        )}
                        aria-label={t("expenses.amount")}
                        data-testid="expense-form-amount"
                      />
                    </FormControl>
                    <FormMessage className="text-center" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <CurrencySelect
                    className="w-24"
                    data-testid="expense-form-currency"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <ConversionField currency={currency} conversion={conversion} />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder={t("expenses.descriptionPlaceholder")}
                      {...field}
                      aria-label={t("expenses.description")}
                      data-testid="expense-form-description"
                      maxLength={512}
                      className={scanned}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="divide-y rounded-lg border">
              <FormField
                control={form.control}
                name="paidByGroupMemberId"
                render={({ field }) => (
                  <FormRow Icon={User} title={t("expenses.paidByField")}>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(value) =>
                        field.onChange(parseInt(value, 10))
                      }
                    >
                      <SelectTrigger
                        className="w-1/2"
                        aria-label={t("expenses.paidByField")}
                        data-testid="expense-form-paid-by"
                      >
                        <SelectValue placeholder={t("expenses.selectPayer")} />
                      </SelectTrigger>
                      <SelectContent>
                        {group.groupMembers.map((member) => (
                          <SelectItem
                            key={member.id}
                            value={member.id.toString()}
                          >
                            {member.user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormRow>
                )}
              />

              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormRow Icon={Tag} title={t("common.category")}>
                    <div className="w-1/2">
                      <ExpenseCategorySelector
                        value={field.value}
                        autoDetect={!isEditMode}
                        onChange={field.onChange}
                      />
                    </div>
                  </FormRow>
                )}
              />

              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormRow Icon={CalendarIcon} title={t("common.date")}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-1/2 justify-start text-left font-normal"
                          aria-label={t("common.date")}
                        >
                          {format(field.value, "PPP", {
                            locale: locale === "de" ? de : undefined,
                          })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => date && field.onChange(date)}
                          autoFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormRow>
                )}
              />

              <div>
                <FormRow Icon={Users} title={t("expenses.splitTitle")}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setView("split")}
                    disabled={amountInCents <= 0}
                    data-testid="expense-form-split"
                  >
                    {t("expenses.reviewSplit", {
                      count: participants.length,
                      method: splitMethod,
                    })}
                    <ChevronRight />
                  </Button>
                </FormRow>
                {splitProblem ? (
                  <p
                    className="text-destructive px-4 pb-3 text-sm"
                    data-testid="expense-form-split-problem"
                  >
                    {t(splitProblem.key, splitProblem.values)}
                  </p>
                ) : (
                  splitMethod !== "equal" &&
                  amountInCents > 0 && (
                    <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 px-4 pb-3 text-sm">
                      {participants.map((participant) => {
                        const member = allMembers.find(
                          (m) => m.id === participant.groupMemberId,
                        );
                        return (
                          <span
                            key={participant.groupMemberId}
                            className="flex items-center gap-1.5"
                          >
                            {member && (
                              <UserAvatar {...memberPerson(member)} size="xs" />
                            )}
                            {formatCurrencyFromCents({
                              cents: participant.amountInCents,
                              currency,
                              locale,
                            })}
                          </span>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </div>

            {failure && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("common.error")}</AlertTitle>
                <AlertDescription>{failure}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={
                isPending ||
                amountInCents <= 0 ||
                conversion.isMissingConverted ||
                !split.validation.isValid
              }
              className="w-full"
              data-testid="expense-form-submit"
            >
              {isPending ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? t("common.updating") : t("common.creating")}
                </>
              ) : isEditMode ? (
                t("expenses.updateExpense")
              ) : (
                t("expenses.createExpense")
              )}
            </Button>
          </>
        )}
      </form>
    </Form>
  );
}
