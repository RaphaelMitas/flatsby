"use client";

import type { ShoppingListFormValues } from "@flatsby/validators/shopping-list";
import { useRouter } from "next/navigation";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  useForm,
} from "@flatsby/ui/form";
import { Input } from "@flatsby/ui/input";
import { shoppingListFormSchema } from "@flatsby/validators/shopping-list";

import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";
import { ShoppingListDashboardItem } from "./ShoppingListDashboardItem";

interface ShoppingListDashboardProps {
  groupId: number;
}

export const ShoppingListDashboard = ({
  groupId,
}: ShoppingListDashboardProps) => {
  const router = useRouter();
  const trpc = useTRPC();
  const createNewListMutation = useMutation(
    trpc.shoppingList.createShoppingList.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          router.push(
            `/group/${groupId}/shopping-list/${data.data.shoppingListId}`,
          );
        }
      },
    }),
  );
  const { data: shoppingLists } = useSuspenseQuery(
    trpc.shoppingList.getShoppingLists.queryOptions({
      groupId,
    }),
  );

  const form = useForm({
    schema: shoppingListFormSchema,
    defaultValues: {
      name: "",
    },
  });

  const handleSubmit = (values: ShoppingListFormValues) => {
    createNewListMutation.mutate({
      groupId,
      name: values.name,
    });
  };

  if (!shoppingLists.success) {
    return handleApiError(shoppingLists.error);
  }

  return (
    <div className="mt-4 flex flex-1 flex-col gap-4">
      {shoppingLists.data.map((list) => (
        <ShoppingListDashboardItem
          key={list.id}
          list={list}
          groupId={groupId}
        />
      ))}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col items-center gap-2 md:flex-row"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full flex-1">
                <FormControl>
                  <Input
                    disabled={createNewListMutation.isPending}
                    placeholder="add new list"
                    {...field}
                    maxLength={
                      shoppingListFormSchema.shape.name.maxLength ?? undefined
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            className="w-full self-start md:w-fit md:min-w-37.5"
            disabled={
              !form.formState.isDirty || createNewListMutation.isPending
            }
            type="submit"
          >
            {createNewListMutation.isPending ? (
              <LoadingSpinner />
            ) : (
              "Create List"
            )}
          </Button>
        </form>
      </Form>
      {(createNewListMutation.isError ||
        createNewListMutation.data?.success === false) && (
        <Alert className="mt-2" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {createNewListMutation.data?.success === false
              ? createNewListMutation.data.error.type
              : (createNewListMutation.error?.data?.code ?? "Error")}
          </AlertTitle>
          <AlertDescription>
            {createNewListMutation.data?.success === false
              ? createNewListMutation.data.error.message
              : (createNewListMutation.error?.message ??
                "unknown error during creation of shopping list")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
