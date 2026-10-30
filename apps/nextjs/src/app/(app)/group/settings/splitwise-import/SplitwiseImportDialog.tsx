"use client";

import type { GroupMemberWithUserInfo } from "@flatsby/api";
import { useCallback, useRef, useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { failureOf } from "@flatsby/api/resultMutation";
import { cn } from "@flatsby/ui";
import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@flatsby/ui/dialog";
import { Input } from "@flatsby/ui/input";
import { Label } from "@flatsby/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@flatsby/ui/table";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import {
  formatCurrencyFromCents,
  memberPerson,
} from "@flatsby/validators/expenses/formatting";
import { useSplitwiseImport } from "@flatsby/validators/expenses/useSplitwiseImport";

import { CurrencySelect } from "~/components/CurrencySelect";
import { useTRPC } from "~/trpc/react";

interface SplitwiseImportDialogProps {
  groupId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SplitwiseImportDialog({
  groupId,
  open,
  onOpenChange,
}: SplitwiseImportDialogProps) {
  const t = useTranslations("splitwiseImport");
  const tCommon = useTranslations("common");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const wizard = useSplitwiseImport();

  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const bulkCreateMutation = useMutation(
    trpc.expense.bulkCreateExpenses.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          void queryClient.invalidateQueries(
            trpc.expense.getGroupExpenses.queryOptions({ groupId }),
          );
          void queryClient.invalidateQueries({
            queryKey: trpc.expense.getDebtSummary.queryKey(),
          });
        }
      },
    }),
  );

  const { handleFileLoad } = wizard;
  const readFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result;
        if (typeof text === "string") {
          handleFileLoad(text);
        }
      };
      reader.readAsText(file);
    },
    [handleFileLoad],
  );

  const handleImport = () => {
    bulkCreateMutation.mutate({
      groupId,
      expenses: wizard.expenses,
    });
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      wizard.reset();
      bulkCreateMutation.reset();
    }
    onOpenChange(newOpen);
  };

  if (!group.success) return null;

  const members = group.data.groupMembers;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("importFromSplitwise")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        {bulkCreateMutation.data?.success ? (
          <div className="space-y-4">
            <Alert variant="success">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>{t("importComplete")}</AlertTitle>
              <AlertDescription>
                {t("importedCount", {
                  count: bulkCreateMutation.data.data.importedCount,
                })}
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>{t("done")}</Button>
            </DialogFooter>
          </div>
        ) : wizard.step === "file" ? (
          <StepFile wizard={wizard} onFile={readFile} />
        ) : wizard.step === "mapping" ? (
          <StepMapping wizard={wizard} members={members} />
        ) : wizard.step === "preview" ? (
          <StepPreview wizard={wizard} />
        ) : (
          <StepConfirm
            wizard={wizard}
            onImport={handleImport}
            isPending={bulkCreateMutation.isPending}
            error={failureOf(bulkCreateMutation, tCommon("unknownError"))}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type WizardReturn = ReturnType<typeof useSplitwiseImport>;

function StepFile({
  wizard,
  onFile,
}: {
  wizard: WizardReturn;
  onFile: (file: File) => void;
}) {
  const t = useTranslations("splitwiseImport");
  const tCommon = useTranslations("common");
  const tRoot = useTranslations();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = Array.from(e.dataTransfer.files).find((f) =>
        f.name.endsWith(".csv"),
      );
      if (file) onFile(file);
    },
    [onFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("csvFile")}</Label>
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
          )}
        >
          <Upload className="text-muted-foreground h-8 w-8" />
          {wizard.parsed ? (
            <p className="text-sm font-medium">{t("fileLoaded")}</p>
          ) : (
            <p className="text-muted-foreground text-sm">{t("dropOrBrowse")}</p>
          )}
        </div>
        <Input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("currencyToImport")}</Label>
        <CurrencySelect value={wizard.currency} onChange={wizard.setCurrency} />
      </div>

      {wizard.parsed && (
        <div className="text-muted-foreground text-sm">
          {t("foundRowsAndPeople", {
            rows: wizard.parsed.rows.length,
            people: wizard.parsed.personNames.length,
            names: wizard.parsed.personNames.join(", "),
          })}
        </div>
      )}

      {wizard.parsed?.errors.map((err, i) => (
        <Alert key={i} variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{tRoot(err.key, err.values)}</AlertDescription>
        </Alert>
      ))}

      <DialogFooter>
        <Button
          disabled={!wizard.parsed || wizard.parsed.rows.length === 0}
          onClick={wizard.goToMapping}
        >
          {tCommon("next")}
        </Button>
      </DialogFooter>
    </div>
  );
}

function StepMapping({
  wizard,
  members,
}: {
  wizard: WizardReturn;
  members: Pick<GroupMemberWithUserInfo, "id" | "userId" | "user">[];
}) {
  const t = useTranslations("splitwiseImport");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{t("mapPeople")}</p>

      {wizard.parsed?.personNames.map((name) => (
        <div key={name} className="flex items-center gap-4">
          <span className="w-32 truncate text-sm font-medium">{name}</span>
          <Select
            value={wizard.memberMapping[name]?.toString() ?? ""}
            onValueChange={(val) =>
              wizard.setMemberMapping(name, parseInt(val, 10))
            }
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={t("selectMember")} />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id.toString()}>
                  <div className="flex items-center gap-2">
                    <UserAvatar {...memberPerson(m)} size="xs" />
                    {m.user.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={wizard.goBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tCommon("back")}
        </Button>
        <Button disabled={!wizard.allNamesMapped} onClick={wizard.goToPreview}>
          {tCommon("next")}
        </Button>
      </DialogFooter>
    </div>
  );
}

function StepPreview({ wizard }: { wizard: WizardReturn }) {
  const t = useTranslations("splitwiseImport");
  const tCommon = useTranslations("common");
  const tRoot = useTranslations();
  const locale = useLocale();
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {t("previewSummary", {
          expenses: wizard.expenses.length,
          skipped: wizard.skipped.length,
        })}
      </p>

      {wizard.expenses.length > 0 && (
        <div className="max-h-64 overflow-y-auto rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tCommon("date")}</TableHead>
                <TableHead>{t("description")}</TableHead>
                <TableHead className="text-right">{t("amount")}</TableHead>
                <TableHead>{t("type")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wizard.previewExpenses.map((exp, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">
                    {exp.expenseDate.toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-sm">
                    {exp.description}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrencyFromCents({
                      cents: exp.amountInCents,
                      currency: exp.currency,
                      locale,
                    })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {exp.splitMethod === "settlement"
                      ? t("settlement")
                      : t("expense")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {wizard.hiddenExpenseCount > 0 && (
        <p className="text-muted-foreground text-center text-sm">
          {t("moreExpenses", { count: wizard.hiddenExpenseCount })}
        </p>
      )}

      {wizard.skipped.length > 0 && (
        <details className="space-y-2">
          <summary className="text-muted-foreground cursor-pointer text-sm">
            {t("skippedRows", { count: wizard.skipped.length })}
          </summary>
          <div className="max-h-32 overflow-y-auto rounded border p-2">
            {wizard.skipped.map((s, i) => (
              <div key={i} className="text-muted-foreground text-xs">
                {t("skippedRow", {
                  row: s.row,
                  reason: tRoot(s.reason.key, s.reason.values),
                })}
              </div>
            ))}
          </div>
        </details>
      )}

      {wizard.isTooLarge && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("tooLargeTitle")}</AlertTitle>
          <AlertDescription>{t("tooLarge")}</AlertDescription>
        </Alert>
      )}

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={wizard.goBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tCommon("back")}
        </Button>
        <Button disabled={!wizard.canConfirm} onClick={wizard.goToConfirm}>
          {tCommon("next")}
        </Button>
      </DialogFooter>
    </div>
  );
}

function StepConfirm({
  wizard,
  onImport,
  isPending,
  error,
}: {
  wizard: WizardReturn;
  onImport: () => void;
  isPending: boolean;
  error: string | undefined;
}) {
  const t = useTranslations("splitwiseImport");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-4">
      <Alert>
        <Upload className="h-4 w-4" />
        <AlertTitle>{t("readyToImport")}</AlertTitle>
        <AlertDescription>
          {t("willBeCreated", { count: wizard.expenses.length })}
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("importFailed")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={wizard.goBack} disabled={isPending}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tCommon("back")}
        </Button>
        <Button onClick={onImport} disabled={isPending}>
          {isPending ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {isPending
            ? t("importing")
            : t("importCount", { count: wizard.expenses.length })}
        </Button>
      </DialogFooter>
    </div>
  );
}
