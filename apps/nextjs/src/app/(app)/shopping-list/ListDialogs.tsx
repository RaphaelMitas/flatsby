"use client";

import type { ShoppingListFormValues } from "@flatsby/validators/shopping-list";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import {
  failureOf,
  restoreSnapshot,
  resultMutation,
} from "@flatsby/api/resultMutation";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@flatsby/ui/dialog";
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

import { useTRPC } from "~/trpc/react";

export function useCreateList(groupId: number) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.shoppingList.createShoppingList.mutationOptions(
      resultMutation({
        onSuccess: ({ shoppingListId }) => {
          void queryClient.invalidateQueries(
            trpc.shoppingList.getShoppingLists.queryOptions({ groupId }),
          );
          router.push(`/shopping-list/${shoppingListId}`);
        },
      }),
    ),
  );
}

export function ListNameForm({
  defaultName,
  submitLabel,
  testId,
  pending,
  onSubmit,
}: {
  defaultName: string;
  submitLabel: string;
  testId: string;
  pending: boolean;
  onSubmit: (name: string) => void;
}) {
  const t = useTranslations("shoppingList");
  const form = useForm<ShoppingListFormValues>({
    resolver: zodResolver(shoppingListFormSchema),
    values: { name: defaultName },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(({ name }) => onSubmit(name.trim()))}
        className="flex flex-col gap-3"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  data-testid={`${testId}-input`}
                  autoFocus
                  placeholder={t("namePlaceholder")}
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
          type="submit"
          data-testid={`${testId}-submit`}
          disabled={pending}
        >
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}

export function CreateListDialog({
  groupId,
  open,
  onOpenChange,
}: {
  groupId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const createList = useCreateList(groupId);
  const failure = failureOf(createList, t("shoppingList.create.failed"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("shoppingList.createShoppingList")}</DialogTitle>
        </DialogHeader>
        <ListNameForm
          defaultName=""
          submitLabel={t("shoppingList.create.submit")}
          testId="shopping-list-create"
          pending={createList.isPending}
          onSubmit={(name) =>
            createList.mutate(
              { groupId, name },
              { onSuccess: () => onOpenChange(false) },
            )
          }
        />
        {failure && <p className="text-destructive text-sm">{failure}</p>}
      </DialogContent>
    </Dialog>
  );
}

export function EditListDialog({
  groupId,
  list,
  isOpenList,
  onOpenChange,
}: {
  groupId: number;
  list: { id: number; name: string } | null;
  isOpenList: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const listsQuery = trpc.shoppingList.getShoppingLists.queryOptions({
    groupId,
  });

  const updateLists = (
    update: <T extends { id: number; name: string }>(lists: T[]) => T[],
  ) => {
    void queryClient.cancelQueries(listsQuery);
    const previous = queryClient.getQueryData(listsQuery.queryKey);
    queryClient.setQueryData(listsQuery.queryKey, (old) =>
      old?.success ? { success: true as const, data: update(old.data) } : old,
    );
    return [{ queryKey: listsQuery.queryKey, previous }];
  };

  const renameMutation = useMutation(
    trpc.shoppingList.changeShoppingListName.mutationOptions(
      resultMutation({
        onMutate: ({ shoppingListId, name }) =>
          updateLists((all) =>
            all.map((item) =>
              item.id === shoppingListId ? { ...item, name } : item,
            ),
          ),
        rollback: restoreSnapshot(queryClient),
        onFailure: (message) =>
          toast.error(t("shoppingList.renameFailed"), {
            description: message ?? t("errors.unexpected"),
          }),
        onSuccess: (_data, { shoppingListId }) => {
          void queryClient.invalidateQueries(listsQuery);
          void queryClient.invalidateQueries(
            trpc.shoppingList.getShoppingList.queryFilter({
              groupId,
              shoppingListId,
            }),
          );
        },
      }),
    ),
  );

  const deleteMutation = useMutation(
    trpc.shoppingList.deleteShoppingList.mutationOptions(
      resultMutation({
        onMutate: ({ shoppingListId }) =>
          updateLists((all) =>
            all.filter((item) => item.id !== shoppingListId),
          ),
        rollback: restoreSnapshot(queryClient),
        onFailure: (message) =>
          toast.error(t("shoppingList.delete.failed"), {
            description: message ?? t("errors.unexpected"),
          }),
        onSuccess: () => {
          void queryClient.invalidateQueries(listsQuery);
        },
      }),
    ),
  );

  if (!list) return null;

  const handleDelete = () => {
    // The server picks the next list, so it must not still see this one
    deleteMutation.mutate(
      { groupId, shoppingListId: list.id },
      { onSuccess: () => isOpenList && router.push("/shopping-list") },
    );
    setConfirmDelete(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("shoppingList.switcher.editTitle")}</DialogTitle>
          </DialogHeader>
          <ListNameForm
            defaultName={list.name}
            submitLabel={t("common.save")}
            testId="shopping-list-rename"
            pending={renameMutation.isPending}
            onSubmit={(name) => {
              if (name !== list.name)
                renameMutation.mutate({ shoppingListId: list.id, name });
              onOpenChange(false);
            }}
          />
          <Button
            variant="ghost"
            data-testid="shopping-list-delete"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash className="size-4" />
            {t("shoppingList.delete.title")}
          </Button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
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
    </>
  );
}
