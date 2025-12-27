"use client";

import type {
  ExpenseWithSplitsAndMembers,
  GroupWithAccess,
} from "@flatsby/api";
import type { ExpenseFormValues } from "@flatsby/validators/expenses/schemas";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@flatsby/ui/form";
import { Input } from "@flatsby/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@flatsby/ui/sheet";
import { toast } from "@flatsby/ui/toast";
import {
  centsToDecimal,
  decimalToCents,
} from "@flatsby/validators/expenses/conversion";
import {
  calculateEvenPercentageBasisPoints,
  distributeEqualAmounts,
  distributePercentageAmounts,
} from "@flatsby/validators/expenses/distribution";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { expenseFormSchema } from "@flatsby/validators/expenses/schemas";
import {
  CURRENCY_CODES,
  isCurrencyCode,
} from "@flatsby/validators/expenses/types";

import { useTRPC } from "~/trpc/react";
import { SplitEditor } from "./SplitEditor";

interface ExpenseFormProps {
  group: GroupWithAccess;
  expense?: ExpenseWithSplitsAndMembers;
  onClose: () => void;
  open: boolean;
}

export function ExpenseForm({
  group,
  expense,
  onClose,
  open,
}: ExpenseFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [splitMethod, setSplitMethod] = useState<
    "equal" | "percentage" | "custom"
  >("equal");

  const isEditMode = !!expense;
  const totalSteps = 3;

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      paidByGroupMemberId:
        expense?.paidByGroupMemberId ?? group.thisGroupMember.id,
      amountInCents: expense?.amountInCents ?? 0,
      currency:
        expense && isCurrencyCode(expense.currency) ? expense.currency : "EUR",
      description: expense?.description ?? "",
      category: expense?.category ?? "",
      expenseDate: expense?.expenseDate
        ? new Date(expense.expenseDate)
        : new Date(),
      splitMethod: "equal",
      splits:
        expense?.expenseSplits.map((split) => ({
          groupMemberId: split.groupMemberId,
          amountInCents: split.amountInCents,
          percentage: split.percentage,
        })) ?? [],
    },
  });

  const createExpenseMutation = useMutation(
    trpc.expense.createExpense.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          toast.success("Expense created successfully");
          void queryClient.invalidateQueries(
            trpc.expense.getGroupExpenses.queryOptions({ groupId: group.id }),
          );
          void queryClient.invalidateQueries(
            trpc.expense.getDebtSummary.queryOptions({ groupId: group.id }),
          );
          onClose();
          form.reset();
          setCurrentStep(1);
        } else {
          toast.error("Failed to create expense", {
            description: data.error.message,
          });
        }
      },
      onError: (error) => {
        toast.error("Failed to create expense", {
          description: error.message,
        });
      },
    }),
  );

  const updateExpenseMutation = useMutation(
    trpc.expense.updateExpense.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          toast.success("Expense updated successfully");
          void queryClient.invalidateQueries(
            trpc.expense.getGroupExpenses.queryOptions({ groupId: group.id }),
          );
          if (expense?.id) {
            void queryClient.invalidateQueries(
              trpc.expense.getExpense.queryOptions({ expenseId: expense.id }),
            );
          }
          void queryClient.invalidateQueries(
            trpc.expense.getDebtSummary.queryOptions({ groupId: group.id }),
          );
          onClose();
        } else {
          toast.error("Failed to update expense", {
            description: data.error.message,
          });
        }
      },
      onError: (error) => {
        toast.error("Failed to update expense", {
          description: error.message,
        });
      },
    }),
  );

  const onSubmit = (values: ExpenseFormValues) => {
    let splits;

    if (values.splitMethod === "equal") {
      const memberIds = values.splits.map((s) => s.groupMemberId);
      splits = distributeEqualAmounts(memberIds, values.amountInCents);
    } else if (values.splitMethod === "percentage") {
      const splitsWithPercentages = values.splits.map((s) => ({
        groupMemberId: s.groupMemberId,
        percentage: s.percentage ?? 0,
      }));
      splits = distributePercentageAmounts(
        splitsWithPercentages,
        values.amountInCents,
      );
    } else {
      splits = values.splits.map((split) => ({
        groupMemberId: split.groupMemberId,
        amountInCents: split.amountInCents,
        percentage: null,
      }));
    }

    if (isEditMode) {
      updateExpenseMutation.mutate({
        expenseId: expense.id,
        paidByGroupMemberId: values.paidByGroupMemberId,
        amountInCents: values.amountInCents,
        currency: values.currency,
        description: values.description,
        category: values.category,
        expenseDate: values.expenseDate,
        splits,
      });
    } else {
      createExpenseMutation.mutate({
        groupId: group.id,
        paidByGroupMemberId: values.paidByGroupMemberId,
        amountInCents: values.amountInCents,
        currency: values.currency,
        description: values.description,
        category: values.category,
        expenseDate: values.expenseDate,
        splits,
        isSettlement: false,
      });
    }
  };

  const handleNext = async () => {
    let fieldsToValidate: (keyof ExpenseFormValues)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = [
        "paidByGroupMemberId",
        "amountInCents",
        "currency",
        "expenseDate",
      ];
    } else if (currentStep === 2) {
      fieldsToValidate = ["splits"];
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      if (currentStep === 1) {
        const currentSplits = form.getValues("splits");
        const amountCents = form.getValues("amountInCents");

        if (currentSplits.length === 0) {
          const memberIds = group.groupMembers.map((m) => m.id);
          const initialSplits = distributeEqualAmounts(memberIds, amountCents);
          form.setValue("splits", initialSplits);
        } else if (splitMethod === "equal") {
          const memberIds = currentSplits.map((s) => s.groupMemberId);
          const updatedSplits = distributeEqualAmounts(memberIds, amountCents);
          form.setValue("splits", updatedSplits);
        } else if (splitMethod === "percentage") {
          const hasPercentages = currentSplits.some(
            (s) => s.percentage && s.percentage > 0,
          );

          if (hasPercentages) {
            const splitsWithPercentages = currentSplits.map((s) => ({
              groupMemberId: s.groupMemberId,
              percentage: s.percentage ?? 0,
            }));
            const updatedSplits = distributePercentageAmounts(
              splitsWithPercentages,
              amountCents,
            );
            form.setValue("splits", updatedSplits);
          } else {
            const memberIds = currentSplits.map((s) => s.groupMemberId);
            const percentages = calculateEvenPercentageBasisPoints(
              memberIds.length,
            );
            const splitsWithPercentages = memberIds.map(
              (groupMemberId, index) => ({
                groupMemberId,
                percentage: percentages[index] ?? 0,
              }),
            );
            const updatedSplits = distributePercentageAmounts(
              splitsWithPercentages,
              amountCents,
            );
            form.setValue("splits", updatedSplits);
          }
        }
      }
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const amountInCents = form.watch("amountInCents");
  const isPending =
    createExpenseMutation.isPending || updateExpenseMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="text-xl">
            {isEditMode ? "Edit Expense" : "Add Expense"}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => onSubmit(values))}
            className="mt-6 space-y-6"
          >
            <div className="text-muted-foreground flex items-center justify-between text-sm">
              <span>
                Step {currentStep} of {totalSteps}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-8 rounded ${
                      i + 1 <= currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>

            {currentStep === 1 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Amount & Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="amountInCents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <FormField
                                control={form.control}
                                name="currency"
                                render={({ field: currencyField }) => (
                                  <Select
                                    value={currencyField.value}
                                    onValueChange={currencyField.onChange}
                                  >
                                    <SelectTrigger className="w-24">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CURRENCY_CODES.map((code) => (
                                        <SelectItem key={code} value={code}>
                                          {code}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                value={
                                  field.value
                                    ? centsToDecimal(field.value).toFixed(2)
                                    : ""
                                }
                                onChange={(e) => {
                                  const decimalValue =
                                    parseFloat(e.target.value) || 0;
                                  field.onChange(decimalToCents(decimalValue));
                                }}
                                className="flex-1"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paidByGroupMemberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Paid By</FormLabel>
                          <Select
                            value={field.value.toString()}
                            onValueChange={(value) =>
                              field.onChange(parseInt(value))
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select who paid" />
                              </SelectTrigger>
                            </FormControl>
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="What was this expense for?"
                              {...field}
                              maxLength={512}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Food, Transport, Utilities"
                              {...field}
                              maxLength={100}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="expenseDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value.toISOString().split("T")[0]}
                              onChange={(e) =>
                                field.onChange(new Date(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {currentStep === 2 && amountInCents > 0 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="splitMethod"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input {...field} value={splitMethod} readOnly />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <SplitEditor
                  form={form}
                  groupMembers={group.groupMembers}
                  totalAmountCents={amountInCents}
                  currency={form.watch("currency")}
                  splitMethod={splitMethod}
                  onSplitMethodChange={(method) => {
                    setSplitMethod(method);
                    form.setValue("splitMethod", method);
                  }}
                />
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Review</CardTitle>
                    <CardDescription>
                      Review your expense before submitting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-semibold">
                        {formatCurrencyFromCents({
                          cents: amountInCents,
                          currency: form.watch("currency"),
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid By:</span>
                      <span className="font-semibold">
                        {group.groupMembers.find(
                          (m) => m.id === form.watch("paidByGroupMemberId"),
                        )?.user.name ?? "Unknown"}
                      </span>
                    </div>
                    {form.watch("description") && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Description:
                        </span>
                        <span className="text-right font-semibold">
                          {form.watch("description")}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Split:</span>
                      <span className="font-semibold">
                        {form.watch("splits").length}{" "}
                        {form.watch("splits").length === 1
                          ? "person"
                          : "people"}{" "}
                        ({splitMethod})
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {(createExpenseMutation.isError ||
              updateExpenseMutation.isError ||
              createExpenseMutation.data?.success === false ||
              updateExpenseMutation.data?.success === false) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {createExpenseMutation.data?.success === false
                    ? createExpenseMutation.data.error.message
                    : updateExpenseMutation.data?.success === false
                      ? updateExpenseMutation.data.error.message
                      : (createExpenseMutation.error?.message ??
                        updateExpenseMutation.error?.message ??
                        "An error occurred")}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 border-t pt-4">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isPending}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isPending || amountInCents <= 0}
                  className="flex-1"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isPending} className="flex-1">
                  {isPending ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      {isEditMode ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>{isEditMode ? "Update Expense" : "Create Expense"}</>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
