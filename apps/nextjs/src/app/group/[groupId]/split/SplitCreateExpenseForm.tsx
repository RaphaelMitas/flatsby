import type { CreateExpenseInput, GroupWithAccess } from "@flatsby/validators";
import * as React from "react";
import { TrashIcon } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import { Button } from "@flatsby/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";
import { Form, FormField, useFieldArray, useForm } from "@flatsby/ui/form";
import { Label } from "@flatsby/ui/label";
import { Separator } from "@flatsby/ui/separator";
import { createExpenseSchema } from "@flatsby/validators";

import { MoneyInput } from "./MoneyInput";
import { SplitCurrencySelect } from "./SplitCurrencySelect";
import { SplitGroupMemberSelect } from "./SplitGroupMemberSelect";
import { SplitMethodSelect } from "./SplitMethodSelect";

const augmentedCreateExpenseSchema = createExpenseSchema.transform((value) => ({
  ...value,
  totalAmountCents: value.paidBy.reduce(
    (acc, p) => Number(acc) + Number(p.amountCents),
    0,
  ),
}));

export const SplitCreateExpenseForm = ({
  group,
}: {
  group: GroupWithAccess;
}) => {
  const form = useForm({
    schema: augmentedCreateExpenseSchema,
    defaultValues: {
      currency: "EUR",
      splitMethod: "equal",
      totalAmountCents: 0,
      participants: group.groupMembers.map((m) => ({
        groupMemberId: m.id,
        value: 0,
      })),
      paidBy: [
        {
          groupMemberId: group.thisGroupMember.id,
          amountCents: 0,
        },
      ],
    },
  });

  const handleSubmit = (values: CreateExpenseInput) => {
    console.log(values);
  };

  return (
    <div className="mx-auto max-w-prose">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-8"
        >
          <div className="flex flex-col gap-2">
            <PaidBySection groupMembers={group.groupMembers} />
            <TotalAmount />
          </div>
          <Separator />

          <FormLabelLayout>
            <Label>Split Method</Label>
            <FormField
              control={form.control}
              name="splitMethod"
              render={({ field }) => <SplitMethodSelect {...field} />}
            />
          </FormLabelLayout>
          <Button
            disabled={form.formState.isSubmitting}
            type="submit"
            onClick={form.handleSubmit(handleSubmit)}
          >
            {form.formState.submitCount}
            {form.formState.isSubmitting ? "Creating..." : "Create Expense"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

const FormLabelLayout = ({ children }: { children: React.ReactNode }) => {
  return <div className="flex w-full flex-col gap-2">{children}</div>;
};

const TotalAmount = () => {
  const form = useFormContext<CreateExpenseInput>();
  const paidBy = useWatch({ control: form.control, name: "paidBy" });
  const currency = useWatch({ control: form.control, name: "currency" });

  const sumCents = React.useMemo(() => {
    const list = paidBy;
    return list.reduce((acc, p) => acc + Number(p.amountCents), 0);
  }, [paidBy]);

  return (
    <div className="flex flex-row gap-2">
      Total Amount: {(sumCents / 100).toFixed(2)} {currency}
    </div>
  );
};

const PaidBySection = ({
  groupMembers,
}: {
  groupMembers: GroupWithAccess["groupMembers"];
}) => {
  const form = useFormContext<CreateExpenseInput>();
  const paidByArray = useFieldArray({ control: form.control, name: "paidBy" });
  const paidBy = useWatch({ control: form.control, name: "paidBy" });

  const availablePaidByGroupMembers = React.useMemo(() => {
    const list = paidBy;
    return groupMembers.filter(
      (m) => !list.some((p) => p.groupMemberId === m.id),
    );
  }, [groupMembers, paidBy]);
  const nextPaidBy = availablePaidByGroupMembers[0];

  return (
    <>
      {paidByArray.fields.map((fieldItem, index) => (
        <Card className="w-full" key={fieldItem.id}>
          <CardHeader className="flex flex-col justify-between">
            <CardTitle className="flex items-center justify-between">
              Amount from{" "}
              {paidByArray.fields.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => paidByArray.remove(index)}
                >
                  <TrashIcon />
                  {/* Remove */}
                </Button>
              )}
            </CardTitle>
            <FormField
              control={form.control}
              name={`paidBy.${index}.groupMemberId`}
              render={({ field }) => (
                <SplitGroupMemberSelect
                  {...field}
                  groupMembers={groupMembers}
                  availableGroupMembers={availablePaidByGroupMembers}
                />
              )}
            />
          </CardHeader>
          <CardContent className="flex w-full flex-row gap-2">
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => <SplitCurrencySelect {...field} />}
            />
            <FormField
              control={form.control}
              name={`paidBy.${index}.amountCents`}
              render={({ field }) => (
                <MoneyInput
                  value={typeof field.value === "number" ? field.value : 0}
                  onChange={(nextCents) => field.onChange(nextCents)}
                />
              )}
            />
          </CardContent>
        </Card>
      ))}
      {nextPaidBy && (
        <Button
          variant="ghost"
          onClick={() => {
            paidByArray.append({
              groupMemberId: nextPaidBy.id,
              amountCents: 0,
            });
          }}
        >
          + add paying person
        </Button>
      )}
    </>
  );
};
