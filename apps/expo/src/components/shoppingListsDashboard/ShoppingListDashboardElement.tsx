import type { ShoppingListFormValues } from "@flatsby/validators/shopping-list";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { useCallback, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import ReanimatedSwipeable, {
  SwipeDirection,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { restoreSnapshot, resultMutation } from "@flatsby/api/resultMutation";
import { shoppingListFormSchema } from "@flatsby/validators/shopping-list";

import type { RouterOutputs } from "~/utils/api";
import { Button } from "~/lib/ui/button";
import { Form, FormField, FormMessage, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { e2eAccessibilityOverride } from "~/utils/e2e";
import { useShoppingStore } from "~/utils/shopping-store";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import { useSwipeActions } from "../SwipeActions";

interface Props {
  shoppingList: Extract<
    RouterOutputs["shoppingList"]["getShoppingLists"],
    { success: true }
  >["data"][number];
  groupId: number;
}

const ShoppingListDashboardElement = ({ shoppingList, groupId }: Props) => {
  const t = useTranslations();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const { setSelectedShoppingList } = useShoppingStore();
  const swipeableRef = useRef<SwipeableMethods>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm({
    schema: shoppingListFormSchema,
    defaultValues: {
      name: shoppingList.name,
    },
  });

  const deleteShoppingListMutation = useMutation(
    trpc.shoppingList.deleteShoppingList.mutationOptions(
      resultMutation({
        onMutate: () => {
          void queryClient.cancelQueries(
            trpc.shoppingList.getShoppingLists.queryOptions({
              groupId,
            }),
          );

          const previousLists = queryClient.getQueryData(
            trpc.shoppingList.getShoppingLists.queryKey({
              groupId,
            }),
          );

          queryClient.setQueryData(
            trpc.shoppingList.getShoppingLists.queryKey({
              groupId,
            }),
            (old) => {
              if (!old?.success) {
                return old;
              }

              return {
                success: true as const,
                data: old.data.filter((list) => list.id !== shoppingList.id),
              };
            },
          );

          return [
            {
              queryKey: trpc.shoppingList.getShoppingLists.queryKey({
                groupId,
              }),
              previous: previousLists,
            },
          ];
        },
        rollback: restoreSnapshot(queryClient),
        onSuccess: () => {
          void queryClient.invalidateQueries(
            trpc.shoppingList.getShoppingLists.queryOptions({
              groupId,
            }),
          );
        },
      }),
    ),
  );

  const renameShoppingListMutation = useMutation(
    trpc.shoppingList.changeShoppingListName.mutationOptions(
      resultMutation({
        onMutate: (data) => {
          void queryClient.cancelQueries(
            trpc.shoppingList.getShoppingLists.queryOptions({
              groupId,
            }),
          );

          const previousLists = queryClient.getQueryData(
            trpc.shoppingList.getShoppingLists.queryKey({
              groupId,
            }),
          );

          queryClient.setQueryData(
            trpc.shoppingList.getShoppingLists.queryKey({
              groupId,
            }),
            (old) => {
              if (!old?.success) {
                return old;
              }

              return {
                success: true as const,
                data: old.data.map((list) =>
                  list.id === shoppingList.id
                    ? { ...list, name: data.name }
                    : list,
                ),
              };
            },
          );

          return [
            {
              queryKey: trpc.shoppingList.getShoppingLists.queryKey({
                groupId,
              }),
              previous: previousLists,
            },
          ];
        },
        rollback: restoreSnapshot(queryClient),
        onSuccess: () => {
          void queryClient.invalidateQueries(
            trpc.shoppingList.getShoppingLists.queryOptions({
              groupId,
            }),
          );
        },
      }),
    ),
  );

  const handleRename = useCallback(
    (data: ShoppingListFormValues) => {
      renameShoppingListMutation.mutate({
        shoppingListId: shoppingList.id,
        name: data.name,
      });
      setIsRenaming(false);
      swipeableRef.current?.close();
    },
    [renameShoppingListMutation, shoppingList.id],
  );

  const handleCancelRename = useCallback(() => {
    setIsRenaming(false);
    form.reset({ name: shoppingList.name });
    swipeableRef.current?.close();
  }, [form, shoppingList.name]);

  const handleDeleteList = () => {
    setShowDeleteModal(false);
    swipeableRef.current?.close();
    deleteShoppingListMutation.mutate({
      groupId,
      shoppingListId: shoppingList.id,
    });
  };

  const handleCloseModal = () => {
    setShowDeleteModal(false);
  };

  const handleListPress = () => {
    setSelectedShoppingList(shoppingList.id, shoppingList.name);
    router.push("/(tabs)/shoppingList");
  };

  const isOptimistic = shoppingList.id === -1;
  const { swipeableProps, guardPress } = useSwipeActions({
    leftAction: {
      text: t("shoppingList.rename"),
      className: "bg-primary",
      textClassName: "text-primary-foreground",
    },
    rightAction: {
      text: t("common.delete"),
      className: "bg-destructive",
      textClassName: "text-destructive-foreground",
    },
  });

  return (
    <>
      <ReanimatedSwipeable
        ref={swipeableRef}
        enabled={!isOptimistic}
        friction={2}
        leftThreshold={40}
        rightThreshold={40}
        {...swipeableProps}
        onSwipeableOpen={(direction) => {
          if (direction === SwipeDirection.LEFT) {
            swipeableRef.current?.close();
            setShowDeleteModal(true);
          } else {
            swipeableRef.current?.close();
            setIsRenaming(true);
          }
        }}
      >
        {isRenaming ? (
          <View className="bg-muted rounded-lg p-4">
            <Form {...form}>
              <View className="flex flex-col gap-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <>
                      <Input
                        testID="shopping-list-rename-input"
                        value={field.value}
                        onChangeText={field.onChange}
                        placeholder={t("shoppingList.renamePlaceholder")}
                        className="flex-1"
                        autoFocus
                      />
                      <FormMessage />
                    </>
                  )}
                />
                <View className="flex flex-row gap-2">
                  <Button
                    title={t("common.cancel")}
                    variant="ghost"
                    size="md"
                    className="flex-1"
                    onPress={handleCancelRename}
                  />
                  <Button
                    testID="shopping-list-rename-save"
                    title={t("common.save")}
                    variant="primary"
                    size="md"
                    className="flex-1"
                    onPress={form.handleSubmit(handleRename)}
                  />
                </View>
              </View>
            </Form>
          </View>
        ) : (
          <TouchableOpacity
            testID="shopping-list-dashboard-link"
            accessible={e2eAccessibilityOverride()}
            className={cn(
              "bg-muted flex-row items-center justify-between rounded-lg p-4",
              isOptimistic && "animate-pulse",
            )}
            disabled={isOptimistic}
            onPress={guardPress(handleListPress)}
            activeOpacity={0.7}
          >
            <View className="flex-1">
              <Text className="text-primary text-lg font-semibold">
                {shoppingList.name}
              </Text>
              {shoppingList.description && (
                <Text className="text-muted-foreground mt-1 text-sm">
                  {shoppingList.description}
                </Text>
              )}
            </View>
            <Text className="text-muted-foreground text-sm">
              {t("shoppingList.itemsLeft", {
                count: shoppingList.uncheckedItemLength,
              })}
            </Text>
          </TouchableOpacity>
        )}
      </ReanimatedSwipeable>

      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={handleCloseModal}
        onConfirm={handleDeleteList}
        itemName={shoppingList.name}
        title={t("shoppingList.delete.title")}
        description={t("shoppingList.delete.description", {
          name: shoppingList.name,
        })}
        confirmationLabel={t("shoppingList.delete.confirmationLabel", {
          name: shoppingList.name,
        })}
        needsConfirmationInput
      />
    </>
  );
};

export default ShoppingListDashboardElement;
