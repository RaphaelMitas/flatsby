"use client";

import type { ApiResult, ShoppingListSummary } from "@flatsby/api";
import type { ShoppingListFormValues } from "@flatsby/validators/shopping-list";
import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash } from "lucide-react";
import { useForm } from "react-hook-form";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@flatsby/ui/alert-dialog";
import { Button, buttonVariants } from "@flatsby/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@flatsby/ui/form";
import { Input } from "@flatsby/ui/input";
import { toast } from "@flatsby/ui/toast";
import { shoppingListFormSchema } from "@flatsby/validators/shopping-list";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";

interface ShoppingListDashboardItemProps {
  list: {
    id: number;
    name: string;
    description: string | null;
    uncheckedItemLength: number;
  };
}

export function ShoppingListDashboardItem({
  list,
}: ShoppingListDashboardItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { currentGroup } = useGroupContext();

  const groupId = currentGroup?.id;

  const form = useForm<ShoppingListFormValues>({
    resolver: zodResolver(shoppingListFormSchema),
    defaultValues: {
      name: list.name,
    },
  });

  const handleDeleteError = (
    groupId: number,
    previousLists: ApiResult<ShoppingListSummary[]> | undefined,
    errorMessage: string,
  ) => {
    if (previousLists) {
      queryClient.setQueryData(
        trpc.shoppingList.getShoppingLists.queryKey({ groupId }),
        previousLists,
      );
    }
    toast.error("Error deleting list", { description: errorMessage });
  };

  const deleteMutation = useMutation(
    trpc.shoppingList.deleteShoppingList.mutationOptions({
      onMutate: async ({ groupId, shoppingListId }) => {
        await queryClient.cancelQueries(
          trpc.shoppingList.getShoppingLists.queryOptions({ groupId }),
        );

        const previousLists = queryClient.getQueryData(
          trpc.shoppingList.getShoppingLists.queryKey({ groupId }),
        );

        queryClient.setQueryData(
          trpc.shoppingList.getShoppingLists.queryKey({ groupId }),
          (old) => {
            if (!old?.success) return old;
            return {
              ...old,
              data: old.data.filter((item) => item.id !== shoppingListId),
            };
          },
        );

        return { previousLists };
      },
      onSuccess: (data, variables, context) => {
        if (!data.success) {
          handleDeleteError(
            variables.groupId,
            context.previousLists,
            data.error.message,
          );
          return;
        }
        void queryClient.invalidateQueries(
          trpc.shoppingList.getShoppingLists.queryOptions({
            groupId: variables.groupId,
          }),
        );
      },
      onError: (error, variables, context) => {
        handleDeleteError(
          variables.groupId,
          context?.previousLists,
          error.message,
        );
      },
    }),
  );

  const handleRenameError = (
    groupId: number | undefined,
    previousLists: ApiResult<ShoppingListSummary[]> | undefined,
    errorMessage: string,
  ) => {
    if (groupId && previousLists) {
      queryClient.setQueryData(
        trpc.shoppingList.getShoppingLists.queryKey({ groupId }),
        previousLists,
      );
    }
    toast.error("Error renaming shopping list", { description: errorMessage });
  };

  const renameMutation = useMutation(
    trpc.shoppingList.changeShoppingListName.mutationOptions({
      onMutate: (data) => {
        if (!groupId) return { previousLists: undefined, groupId: undefined };

        void queryClient.cancelQueries(
          trpc.shoppingList.getShoppingLists.queryOptions({ groupId }),
        );

        const previousLists = queryClient.getQueryData(
          trpc.shoppingList.getShoppingLists.queryOptions({ groupId }).queryKey,
        );

        queryClient.setQueryData(
          trpc.shoppingList.getShoppingLists.queryOptions({ groupId }).queryKey,
          (old) => {
            if (!old?.success) {
              return old;
            }

            return {
              ...old,
              data: old.data.map((item) =>
                item.id === list.id ? { ...item, name: data.name } : item,
              ),
            };
          },
        );

        return { previousLists, groupId };
      },
      onSuccess: (data, _variables, context) => {
        if (data.success === false) {
          handleRenameError(
            context.groupId,
            context.previousLists,
            data.error.message,
          );
          return;
        }

        toast.success("Shopping list renamed successfully");
        if (context.groupId) {
          void queryClient.invalidateQueries(
            trpc.shoppingList.getShoppingLists.queryOptions({
              groupId: context.groupId,
            }),
          );
        }
      },
      onError: (error, _variables, context) => {
        const errorMessage = Object.entries(
          error.data?.zodError?.fieldErrors ?? {},
        )
          .map(([_, errors]) => errors?.map((error) => error).join(", "))
          .join(", ");

        handleRenameError(
          context?.groupId,
          context?.previousLists,
          errorMessage.length > 0 ? errorMessage : "Unknown error",
        );
      },
    }),
  );

  const handleDelete = () => {
    if (!groupId) return;
    deleteMutation.mutate({
      groupId,
      shoppingListId: list.id,
    });
    setShowDeleteDialog(false);
  };

  const handleRename = (data: ShoppingListFormValues) => {
    if (data.name.trim() === list.name.trim()) {
      setIsRenaming(false);
      return;
    }

    renameMutation.mutate({
      shoppingListId: list.id,
      name: data.name.trim(),
    });
    setIsRenaming(false);
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
    form.reset({ name: list.name });
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRenaming(true);
  };

  if (isRenaming) {
    return (
      <div className="group bg-muted relative rounded-lg p-4 shadow">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleRename)}
            className="flex items-center gap-2"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      {...field}
                      autoFocus
                      placeholder="Enter shopping list name"
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          handleCancelRename();
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 self-start">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancelRename}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={renameMutation.isPending}>
                Save
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="bg-muted md:group-hover:bg-primary flex cursor-pointer items-center justify-between gap-4 rounded-lg p-4 shadow">
        <div className="flex flex-col gap-2 truncate sm:flex-1 sm:flex-row sm:justify-between">
          <Link
            href={`/shopping-list/${list.id}`}
            className="md:group-hover:text-primary-foreground flex flex-1 flex-col gap-2 truncate"
          >
            <h3 className="truncate text-lg font-semibold">{list.name}</h3>
            {list.description && (
              <p className="text-muted-foreground truncate text-sm">
                {list.description}
              </p>
            )}
          </Link>
          <div className="text-muted-foreground self-start text-sm sm:self-center">
            {list.uncheckedItemLength} items left
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="md:group-hover:text-primary-foreground md:group-hover:hover:text-info cursor-pointer rounded p-2 transition-colors"
            onClick={handleEditClick}
            title="Rename shopping list"
          >
            <Pencil size={24} />
          </div>
          <div
            className="md:group-hover:text-primary-foreground md:group-hover:hover:text-destructive cursor-pointer rounded p-2 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            title="Delete shopping list"
          >
            <Trash size={24} />
          </div>
        </div>
      </div>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shopping List</AlertDialogTitle>
            <AlertDialogDescription className="wrap-break-word break-all">
              Are you sure you want to delete &quot;{list.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
