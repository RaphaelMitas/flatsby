import type { ApiResult, ShoppingListSummary } from "@flatsby/api";
import type { ShoppingListFormValues } from "@flatsby/validators/shopping-list";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { shoppingListFormSchema } from "@flatsby/validators/shopping-list";

import { Button } from "~/lib/ui/button";
import { Form, FormControl, FormField, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { trpc } from "~/utils/api";

export default function CreateShoppingList() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const handleGoBack = () => {
    router.back();
  };
  const queryClient = useQueryClient();
  const groupIdNumber = groupId ? parseInt(groupId, 10) : 0;

  const onCreateShoppingListError = (
    previousLists: ApiResult<ShoppingListSummary[]> | undefined,
  ) => {
    queryClient.setQueryData(
      trpc.shoppingList.getShoppingLists.queryKey({
        groupId: groupIdNumber,
      }),
      previousLists,
    );
  };

  const createShoppingListMutation = useMutation(
    trpc.shoppingList.createShoppingList.mutationOptions({
      onMutate: (data) => {
        void queryClient.cancelQueries(
          trpc.shoppingList.getShoppingLists.queryOptions({
            groupId: groupIdNumber,
          }),
        );

        const previousLists = queryClient.getQueryData(
          trpc.shoppingList.getShoppingLists.queryKey({
            groupId: groupIdNumber,
          }),
        );

        const newShoppingList = {
          ...data,
          id: -1,
          uncheckedItemLength: 0,
          description: null,
          icon: null,
        };

        queryClient.setQueryData(
          trpc.shoppingList.getShoppingLists.queryKey({
            groupId: groupIdNumber,
          }),
          (old) => {
            if (!old?.success) {
              return old;
            }

            return {
              ...old,
              data: [...old.data, newShoppingList],
            };
          },
        );
        router.back();

        return { previousLists };
      },
      onError: (error, variables, context) => {
        onCreateShoppingListError(context?.previousLists);
      },
      onSuccess: (data, variables, context) => {
        if (!data.success) {
          onCreateShoppingListError(context.previousLists);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.shoppingList.getShoppingLists.queryOptions({
            groupId: groupIdNumber,
          }),
        );
      },
    }),
  );

  const form = useForm({
    schema: shoppingListFormSchema,
    defaultValues: {
      name: "",
    },
  });

  const handleCreateShoppingList = (values: ShoppingListFormValues) => {
    createShoppingListMutation.mutate({
      groupId: groupIdNumber,
      name: values.name,
    });
  };

  return (
    <View className="bg-background flex-1 p-4">
      <Form {...form}>
        <View className="flex gap-2">
          <Label htmlFor="name">List Name</Label>
          <FormField
            name="name"
            control={form.control}
            render={({ field }) => (
              <FormControl>
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Enter your shopping list name"
                  className="w-full"
                  error={!!form.formState.errors.name}
                  maxLength={
                    shoppingListFormSchema.shape.name.maxLength ?? undefined
                  }
                />
              </FormControl>
            )}
          />
          {form.formState.errors.name && (
            <Text className="text-destructive">
              {form.formState.errors.name.message}
            </Text>
          )}

          <View className="flex flex-row gap-2">
            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleGoBack}
              className="flex-1"
            />
            <Button
              title={form.formState.isSubmitting ? "Creating..." : "Create"}
              className="flex-1"
              disabled={form.formState.isSubmitting}
              icon={form.formState.isSubmitting ? "loader" : undefined}
              onPress={form.handleSubmit(handleCreateShoppingList)}
            />
          </View>
        </View>
      </Form>
    </View>
  );
}
