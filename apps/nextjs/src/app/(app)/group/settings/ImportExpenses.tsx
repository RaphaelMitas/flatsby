"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("splitwiseImport");
  const tCommon = useTranslations("common");
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
          <CardTitle>{t("importExpenses")}</CardTitle>
          <CardDescription>{t("importExpensesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            {t("importFromSplitwise")}
          </Button>

          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={(open) => {
              setDeleteDialogOpen(open);
              if (!open) setConfirmName("");
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={deleteAllMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteAllMutation.isPending
                  ? tCommon("deleting")
                  : t("resetExpenses")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteAllTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t.rich("deleteAllDescription", { groupName, group: bold })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Label htmlFor="confirm-group-name">
                  {t.rich("typeToConfirm", { groupName, group: bold })}
                </Label>
                <Input
                  id="confirm-group-name"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={groupName}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={confirmName !== groupName}
                  onClick={() => {
                    deleteAllMutation.mutate({ groupId });
                    setDeleteDialogOpen(false);
                  }}
                >
                  {t("deleteAll")}
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

function bold(chunks: React.ReactNode) {
  return <span className="font-semibold">{chunks}</span>;
}
