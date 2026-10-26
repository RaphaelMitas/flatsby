"use client";

import type { ShoppingListFormValues } from "@flatsby/validators/shopping-list";
import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { restoreSnapshot, resultMutation } from "@flatsby/api/resultMutation";
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
  const t = useTranslations();
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

  const deleteMutation = useMutation(
    trpc.shoppingList.deleteShoppingList.mutationOptions(
      resultMutation({
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
                success: true as const,
                data: old.data.filter((item) => item.id !== shoppingListId),
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
        onFailure: (message) =>
          toast.error(t("shoppingList.delete.failed"), {
            description: message ?? t("errors.unexpected"),
          }),
        onSuccess: (_data, variables) => {
          void queryClient.invalidateQueries(
            trpc.shoppingList.getShoppingLists.queryOptions({
              groupId: variables.groupId,
            }),
          );
        },
      }),
    ),
  );

  const renameMutation = useMutation(
    trpc.shoppingList.changeShoppingListName.mutationOptions(
      resultMutation({
        onMutate: (data) => {
          if (!groupId) return;

          void queryClient.cancelQueries(
            trpc.shoppingList.getShoppingLists.queryOptions({ groupId }),
          );

          const previousLists = queryClient.getQueryData(
            trpc.shoppingList.getShoppingLists.queryOptions({ groupId })
              .queryKey,
          );

          queryClient.setQueryData(
            trpc.shoppingList.getShoppingLists.queryOptions({ groupId })
              .queryKey,
            (old) => {
              if (!old?.success) {
                return old;
              }

              return {
                success: true as const,
                data: old.data.map((item) =>
                  item.id === list.id ? { ...item, name: data.name } : item,
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
        onFailure: (message) =>
          toast.error(t("shoppingList.renameFailed"), {
            description: message ?? t("errors.unexpected"),
          }),
        onSuccess: () => {
          toast.success(t("shoppingList.renamed"));
          if (groupId) {
            void queryClient.invalidateQueries(
              trpc.shoppingList.getShoppingLists.queryOptions({ groupId }),
            );
          }
        },
      }),
    ),
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
                      data-testid="shopping-list-rename-input"
                      autoFocus
                      placeholder={t("shoppingList.namePlaceholder")}
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
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                data-testid="shopping-list-rename-save"
                disabled={renameMutation.isPending}
              >
                {t("common.save")}
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
            data-testid={`shopping-list-dashboard-link-${list.id}`}
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
            {t("shoppingList.itemsLeft", { count: list.uncheckedItemLength })}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div
            data-testid={`shopping-list-dashboard-rename-${list.id}`}
            className="md:group-hover:text-primary-foreground md:group-hover:hover:text-info cursor-pointer rounded p-2 transition-colors"
            onClick={handleEditClick}
            title={t("shoppingList.renameTooltip")}
          >
            <Pencil size={24} />
          </div>
          <div
            data-testid={`shopping-list-dashboard-delete-${list.id}`}
            className="md:group-hover:text-primary-foreground md:group-hover:hover:text-destructive cursor-pointer rounded p-2 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            title={t("shoppingList.delete.tooltip")}
          >
            <Trash size={24} />
          </div>
        </div>
      </div>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="shopping-list-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("shoppingList.delete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="wrap-break-word break-all">
              {t("shoppingList.delete.descriptionShort", { name: list.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className={buttonVariants({ variant: "destructive" })}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
