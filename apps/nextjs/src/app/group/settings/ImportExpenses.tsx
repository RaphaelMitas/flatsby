"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Upload } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@flatsby/ui/alert-dialog";
import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";

import { useTRPC } from "~/trpc/react";
import { SplitwiseImportDialog } from "./splitwise-import/SplitwiseImportDialog";

interface ImportExpensesProps {
  groupId: number;
}

export default function ImportExpenses({ groupId }: ImportExpensesProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteAllMutation = useMutation(
    trpc.expense.deleteAllGroupExpenses.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          void queryClient.invalidateQueries({
            queryKey: trpc.expense.getGroupExpenses.queryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: trpc.expense.getDebtSummary.queryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: trpc.expense.getExpense.queryKey(),
          });
        }
      },
    }),
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Import Expenses</CardTitle>
          <CardDescription>
            Import expense history from other apps.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import from Splitwise
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleteAllMutation.isPending}>
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteAllMutation.isPending ? "Deleting..." : "Reset Expenses"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all expenses?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all expenses and settlements in
                  this group. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteAllMutation.mutate({ groupId })}
                >
                  Delete all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <SplitwiseImportDialog
        groupId={groupId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
