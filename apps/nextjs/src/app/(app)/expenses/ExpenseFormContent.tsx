"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useRef } from "react";
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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@flatsby/ui/item";
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
  formatCurrencyFromCents,
  memberPerson,
} from "@flatsby/validators/expenses/formatting";

import type { UseExpenseFormReturn } from "./useExpenseForm";
import { CurrencyInput } from "~/components/CurrencyInput";
import { CurrencySelect } from "~/components/CurrencySelect";
import { ConversionField } from "./ConversionField";
import { ExpenseCategorySelector } from "./ExpenseCategorySelector";
import { ReceiptScanButton, ReceiptScanFailed } from "./ReceiptScan";
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
    <Item size="sm">
      <ItemMedia variant="icon">
        <Icon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
      </ItemContent>
      {children}
    </Item>
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
  const scanFileInput = useRef<HTMLInputElement>(null);
  const scanned = receiptScan.justApplied
    ? "ring-primary/40 ring-2"
    : undefined;
  const failure =
    failureOf(createExpenseMutation, t("expenses.genericError")) ??
    failureOf(updateExpenseMutation, t("expenses.genericError"));

  return (
    <Form {...form}>
      <form
        onSubmit={
          view === "split"
            ? (event) => event.preventDefault()
            : form.handleSubmit((values) => onSubmit(values))
        }
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
          {view === "details" && !isEditMode && (
            <div className="ml-auto">
              <ReceiptScanButton
                receiptScan={receiptScan}
                fileInput={scanFileInput}
              />
            </div>
          )}
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
            {!isEditMode && (
              <ReceiptScanFailed
                receiptScan={receiptScan}
                fileInput={scanFileInput}
              />
            )}

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
                        autoFocus={!isEditMode && field.value === 0}
                        enterKeyHint="next"
                        onEnter={() => form.setFocus("description")}
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

            <ItemGroup className="rounded-lg border">
              <FormField
                control={form.control}
                name="paidByGroupMemberId"
                render={({ field }) => (
                  <FormRow Icon={User} title={t("expenses.paidByField")}>
                    <ItemActions className="basis-1/2">
                      <Select
                        value={field.value.toString()}
                        onValueChange={(value) =>
                          field.onChange(parseInt(value, 10))
                        }
                      >
                        <SelectTrigger
                          className="w-full"
                          aria-label={t("expenses.paidByField")}
                          data-testid="expense-form-paid-by"
                        >
                          <SelectValue
                            placeholder={t("expenses.selectPayer")}
                          />
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
                    </ItemActions>
                  </FormRow>
                )}
              />
              <ItemSeparator />
              <FormRow Icon={Users} title={t("expenses.splitTitle")}>
                <ItemActions>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setView("split")}
                    disabled={amountInCents <= 0}
                    data-testid="expense-form-split"
                  >
                    {t("expenses.reviewSplit", {
                      count: split.participants.length,
                      method: splitMethod,
                    })}
                    <ChevronRight />
                  </Button>
                </ItemActions>
                {split.problem ? (
                  <p
                    className="text-destructive basis-full text-sm"
                    data-testid="expense-form-split-problem"
                  >
                    {t(split.problem.key, split.problem.values)}
                  </p>
                ) : (
                  splitMethod !== "equal" &&
                  amountInCents > 0 && (
                    <div className="text-muted-foreground flex basis-full flex-wrap gap-x-3 gap-y-1 text-sm">
                      {split.participants.map((participant) => {
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
              </FormRow>
              <ItemSeparator />

              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormRow Icon={Tag} title={t("common.category")}>
                    <ItemActions className="basis-1/2">
                      <ExpenseCategorySelector
                        value={field.value}
                        autoDetect={!isEditMode}
                        onChange={field.onChange}
                      />
                    </ItemActions>
                  </FormRow>
                )}
              />
              <ItemSeparator />

              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormRow Icon={CalendarIcon} title={t("common.date")}>
                    <ItemActions className="basis-1/2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
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
                    </ItemActions>
                  </FormRow>
                )}
              />
            </ItemGroup>

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
