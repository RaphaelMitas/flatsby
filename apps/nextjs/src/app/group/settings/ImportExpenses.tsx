"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Upload } from "lucide-react";

import {
  AlertDialog,
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
import { Input } from "@flatsby/ui/input";
import { Label } from "@flatsby/ui/label";

import { useTRPC } from "~/trpc/react";
import { SplitwiseImportDialog } from "./splitwise-import/SplitwiseImportDialog";

interface ImportExpensesProps {
  groupId: number;
  groupName: string;
}

export default function ImportExpenses({
  groupId,
  groupName,
}: ImportExpensesProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteAllMutation = useMutation(
    trpc.expense.deleteAllGroupExpenses.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          void queryClient.invalidateQueries({
            queryKey: [["expense"]],
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

          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={(open) => {
              setDeleteDialogOpen(open);
              if (!open) setConfirmName("");
            }}
          >
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
                  This will permanently delete all expenses and settlements in{" "}
                  <span className="font-semibold">{groupName}</span>. This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Label htmlFor="confirm-group-name">
                  Type <span className="font-semibold">{groupName}</span> to
                  confirm
                </Label>
                <Input
                  id="confirm-group-name"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={groupName}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={confirmName !== groupName}
                  onClick={() => {
                    deleteAllMutation.mutate({ groupId });
                    setDeleteDialogOpen(false);
                  }}
                >
                  Delete all
                </Button>
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
