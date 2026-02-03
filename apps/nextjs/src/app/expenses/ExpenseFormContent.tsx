"use client";

import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarIcon,
  LoaderCircle,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";
import { Calendar } from "@flatsby/ui/calendar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@flatsby/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { CURRENCY_CODES } from "@flatsby/validators/expenses/types";

import type { UseExpenseFormReturn } from "./useExpenseForm";
import { CurrencyInput } from "~/components/CurrencyInput";
import { SplitEditor } from "./SplitEditor";

interface ExpenseFormContentProps {
  formState: UseExpenseFormReturn;
}

export function ExpenseFormContent({ formState }: ExpenseFormContentProps) {
  const {
    form,
    currentStep,
    totalSteps,
    isEditMode,
    splitMethod,
    amountInCents,
    currency,
    paidByGroupMemberId,
    description,
    splits,
    isPending,
    createExpenseMutation,
    updateExpenseMutation,
    onSubmit,
    handleNext,
    handleBack,
    group,
  } = formState;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit(values))}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEditMode ? "Edit Expense" : "Add Expense"}
          </h2>
          <div className="text-muted-foreground flex items-center gap-4 text-sm">
            <span>
              Step {currentStep}/{totalSteps}
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
        </div>

        {currentStep === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Amount & Details</CardTitle>
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
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(field.value, "PPP")}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => date && field.onChange(date)}
                            autoFocus
                          />
                        </PopoverContent>
                      </Popover>
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
              splitMethod={splitMethod !== "settlement" ? splitMethod : "equal"}
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
                    <span className="text-muted-foreground">Description:</span>
                    <span className="text-right font-semibold">
                      {description}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Split:</span>
                  <span className="font-semibold">
                    {splits.length} {splits.length === 1 ? "person" : "people"}{" "}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleNext();
              }}
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
  );
}
