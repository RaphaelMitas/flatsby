"use client";

import type {
  ExpenseWithSplitsAndMembers,
  GroupWithAccess,
} from "@flatsby/api";
import type { ExpenseValues } from "@flatsby/validators/expenses/schemas";
import type { SplitMethod } from "@flatsby/validators/expenses/types";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, ArrowRight, LoaderCircle, X } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

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
import { toast } from "@flatsby/ui/toast";
import {
  calculateEvenPercentageBasisPoints,
  distributeEqualAmounts,
  distributePercentageAmounts,
} from "@flatsby/validators/expenses/distribution";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { expenseSchemaWithValidateSplits } from "@flatsby/validators/expenses/schemas";
import {
  CURRENCY_CODES,
  isCurrencyCode,
} from "@flatsby/validators/expenses/types";

import { CurrencyInput } from "~/components/CurrencyInput";
import { useTRPC } from "~/trpc/react";
import { SplitEditor } from "./SplitEditor";

interface ExpenseFormInlineProps {
  group: GroupWithAccess;
  expense?: ExpenseWithSplitsAndMembers;
  onClose: () => void;
  onSuccess?: (expenseId: number) => void;
}

export function ExpenseFormInline({
  group,
  expense,
  onClose,
  onSuccess,
}: ExpenseFormInlineProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);

  const isEditMode = !!expense;
  const totalSteps = 3;

  const expenseListQueryKey = trpc.expense.getGroupExpenses.infiniteQueryKey({
    groupId: group.id,
    limit: 20,
  });

  const expenseQueryKey = expense
    ? trpc.expense.getExpense.queryKey({
        expenseId: expense.id,
      })
    : undefined;

  const initialSplitMethod: SplitMethod =
    expense?.splitMethod === "equal" ||
    expense?.splitMethod === "percentage" ||
    expense?.splitMethod === "custom"
      ? expense.splitMethod
      : "equal";

  const form = useForm<ExpenseValues>({
    resolver: zodResolver(expenseSchemaWithValidateSplits),
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
      splitMethod: initialSplitMethod,
      splits:
        expense?.expenseSplits.map((split) => ({
          groupMemberId: split.groupMemberId,
          amountInCents: split.amountInCents,
          percentage: split.percentage,
        })) ?? [],
    },
  });
  const splitMethod = useWatch({ control: form.control, name: "splitMethod" });

  const createExpenseMutation = useMutation(
    trpc.expense.createExpense.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries(
          trpc.expense.getGroupExpenses.queryOptions({
            groupId: group.id,
            limit: 20,
          }),
        );

        const previousData = queryClient.getQueryData(
          trpc.expense.getGroupExpenses.infiniteQueryKey({
            groupId: group.id,
            limit: 20,
          }),
        );

        const paidByMember = group.groupMembers.find(
          (m) => m.id === input.paidByGroupMemberId,
        );
        const currentMember = group.thisGroupMember;

        queryClient.setQueryData(
          trpc.expense.getGroupExpenses.infiniteQueryKey({
            groupId: group.id,
            limit: 20,
          }),
          (old) => {
            if (!old) return old;

            const optimisticExpense = {
              id: Date.now(),
              groupId: group.id,
              paidByGroupMemberId: input.paidByGroupMemberId,
              amountInCents: input.amountInCents,
              currency: input.currency,
              description: input.description ?? null,
              category: input.category ?? null,
              expenseDate: input.expenseDate,
              createdByGroupMemberId: currentMember.id,
              splitMethod: input.splitMethod,
              createdAt: new Date(),
              updatedAt: new Date(),
              paidByGroupMember: paidByMember
                ? {
                    id: paidByMember.id,
                    groupId: group.id,
                    userId: paidByMember.userId,
                    role: paidByMember.role,
                    joinedOn: paidByMember.joinedOn,
                    user: paidByMember.user,
                  }
                : {
                    id: input.paidByGroupMemberId,
                    groupId: group.id,
                    userId: "",
                    role: "member" as const,
                    joinedOn: new Date(),
                    user: { email: "", name: "Unknown", image: null },
                  },
              createdByGroupMember: {
                id: currentMember.id,
                groupId: group.id,
                userId: currentMember.userId,
                role: currentMember.role,
                joinedOn: currentMember.joinedOn,
                user: currentMember.user,
              },
              expenseSplits: input.splits.map((split, index) => {
                const member = group.groupMembers.find(
                  (m) => m.id === split.groupMemberId,
                );
                return {
                  id: Date.now() + index,
                  createdAt: new Date(),
                  expenseId: Date.now(),
                  groupMemberId: split.groupMemberId,
                  amountInCents: split.amountInCents,
                  percentage: split.percentage,
                  groupMember: member
                    ? {
                        id: member.id,
                        groupId: group.id,
                        userId: member.userId,
                        role: member.role,
                        joinedOn: member.joinedOn,
                        user: member.user,
                      }
                    : {
                        id: split.groupMemberId,
                        groupId: group.id,
                        userId: "",
                        role: "member" as const,
                        joinedOn: new Date(),
                        user: { email: "", name: "Unknown", image: null },
                      },
                };
              }),
              isPending: true,
            };

            const updatedPages = old.pages.map((page, pageIndex) => {
              if (page.success === false) return page;
              if (pageIndex !== 0) return page;

              return {
                ...page,
                data: {
                  ...page.data,
                  items: [optimisticExpense, ...page.data.items],
                },
              };
            });

            return { ...old, pages: updatedPages };
          },
        );

        return { previousData };
      },
      onError: (error, _variables, context) => {
        if (context?.previousData) {
          queryClient.setQueryData(expenseListQueryKey, context.previousData);
        }
        toast.error("Failed to create expense", {
          description: error.message,
        });
      },
      onSuccess: (data, _variables, context) => {
        if (data.success === false) {
          if (context.previousData) {
            queryClient.setQueryData(expenseListQueryKey, context.previousData);
          }
          toast.error("Failed to create expense", {
            description: data.error.message,
          });
          return;
        }

        toast.success("Expense created successfully");
        void queryClient.invalidateQueries({
          queryKey: trpc.expense.getGroupExpenses.infiniteQueryKey({
            groupId: group.id,
            limit: 20,
          }),
        });
        void queryClient.invalidateQueries(
          trpc.expense.getDebtSummary.queryOptions({ groupId: group.id }),
        );
        onSuccess?.(data.data.id);
        onClose();
        form.reset();
        setCurrentStep(1);
      },
    }),
  );

  const updateExpenseMutation = useMutation(
    trpc.expense.updateExpense.mutationOptions({
      onMutate: async (input) => {
        if (!expense || !expenseQueryKey) return;
        await queryClient.cancelQueries(
          trpc.expense.getExpense.queryOptions({
            expenseId: expense.id,
          }),
        );

        const previousData = queryClient.getQueryData(expenseQueryKey);

        queryClient.setQueryData(expenseQueryKey, (old) => {
          if (!old || old.success === false) return old;

          return {
            ...old,
            data: {
              ...old.data,
              ...input,
              expenseSplits: input.splits
                ? input.splits.map((split, index) => {
                    const member = group.groupMembers.find(
                      (m) => m.id === split.groupMemberId,
                    );
                    const splits = {
                      ...split,
                      id: Date.now() + index,
                      createdAt: new Date(),
                      expenseId: expense.id,
                      groupMember: member
                        ? { ...member, groupId: group.id }
                        : {
                            id: split.groupMemberId,
                            groupId: group.id,
                            userId: "",
                            role: "member" as const,
                            joinedOn: new Date(),
                            user: { email: "", name: "Unknown", image: null },
                          },
                    };
                    return splits;
                  })
                : old.data.expenseSplits,
            },
          };
        });

        return { previousData };
      },
      onError: (error, _variables, context) => {
        if (context?.previousData && expenseQueryKey) {
          queryClient.setQueryData(expenseQueryKey, context.previousData);
        }
        toast.error("Failed to update expense", {
          description: error.message,
        });
      },
      onSuccess: (data, _variables, context) => {
        if (data.success === false) {
          if (context?.previousData && expenseQueryKey) {
            queryClient.setQueryData(expenseQueryKey, context.previousData);
          }
          toast.error("Failed to update expense", {
            description: data.error.message,
          });
          return;
        }

        toast.success("Expense updated successfully");
        void queryClient.invalidateQueries({
          queryKey: expenseListQueryKey,
        });
        if (expense?.id) {
          void queryClient.invalidateQueries(
            trpc.expense.getExpense.queryOptions({ expenseId: expense.id }),
          );
        }
        void queryClient.invalidateQueries(
          trpc.expense.getDebtSummary.queryOptions({ groupId: group.id }),
        );
        if (expense) {
          onSuccess?.(expense.id);
        }
        onClose();
      },
    }),
  );

  const onSubmit = (values: ExpenseValues) => {
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
        splitMethod: values.splitMethod,
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
        splitMethod: values.splitMethod,
      });
    }
  };

  const handleNext = async () => {
    let fieldsToValidate: (keyof ExpenseValues)[] = [];

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

  const amountInCents = useWatch({
    control: form.control,
    name: "amountInCents",
  });
  const currency = useWatch({ control: form.control, name: "currency" });
  const paidByGroupMemberId = useWatch({
    control: form.control,
    name: "paidByGroupMemberId",
  });
  const description = useWatch({ control: form.control, name: "description" });
  const splits = useWatch({ control: form.control, name: "splits" });
  const isPending =
    createExpenseMutation.isPending || updateExpenseMutation.isPending;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-xl font-semibold">
          {isEditMode ? "Edit Expense" : "Add Expense"}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => onSubmit(values))}
            className="space-y-6"
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
                              <CurrencyInput
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="0.00"
                                min={1}
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
                  currency={currency}
                  splitMethod={
                    splitMethod !== "settlement" ? splitMethod : "equal"
                  }
                  onSplitMethodChange={(method) => {
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
                          currency: currency,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid By:</span>
                      <span className="font-semibold">
                        {group.groupMembers.find(
                          (m) => m.id === paidByGroupMemberId,
                        )?.user.name ?? "Unknown"}
                      </span>
                    </div>
                    {description && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Description:
                        </span>
                        <span className="text-right font-semibold">
                          {description}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Split:</span>
                      <span className="font-semibold">
                        {splits.length}{" "}
                        {splits.length === 1 ? "person" : "people"} (
                        {splitMethod})
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
      </div>
    </div>
  );
}
