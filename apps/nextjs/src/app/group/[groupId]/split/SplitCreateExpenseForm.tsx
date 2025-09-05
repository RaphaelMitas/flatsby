import type {
  CreateExpenseInput,
  GroupWithGroupMembers,
} from "@flatsby/validators";

import { Button } from "@flatsby/ui/button";
import { Form, FormField, useForm } from "@flatsby/ui/form";
import { Input } from "@flatsby/ui/input";
import { Label } from "@flatsby/ui/label";
import { createExpenseSchema } from "@flatsby/validators";

import { SplitCurrencySelect } from "./SplitCurrencySelect";
import { SplitMethodSelect } from "./SplitMethodSelect";

export const SplitCreateExpenseForm = ({
  group,
}: {
  group: GroupWithGroupMembers;
}) => {
  const form = useForm({
    schema: createExpenseSchema,
    defaultValues: {
      currency: "EUR",
      splitMethod: "equal",
      participants: group.groupMembers.map((m) => ({
        groupMemberId: m.id,
        value: 0,
      })),
      paidBy: group.groupMembers.map((m) => ({
        groupMemberId: m.id,
        amountCents: 0,
      })),
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
          className="flex flex-col gap-2"
        >
          <FormLabelLayout>
            <Label>Amount</Label>
            <div className="flex flex-row gap-2">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => <SplitCurrencySelect {...field} />}
              />
              <FormField
                control={form.control}
                name="totalAmountCents"
                render={({ field }) => <Input {...field} />}
              />
            </div>
          </FormLabelLayout>
          <FormLabelLayout>
            <Label>Split Method</Label>
            <FormField
              control={form.control}
              name="splitMethod"
              render={({ field }) => <SplitMethodSelect {...field} />}
            />
          </FormLabelLayout>
          <Button type="submit" onClick={form.handleSubmit(handleSubmit)}>
            Create Expense
          </Button>
        </form>
      </Form>
    </div>
  );
};

const FormLabelLayout = ({ children }: { children: React.ReactNode }) => {
  return <div className="flex flex-col gap-2">{children}</div>;
};
