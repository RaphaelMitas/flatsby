"use client";

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

import { cn } from "@flatsby/ui";
import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { UserAvatar } from "@flatsby/ui/user-avatar";
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
import { centsToDecimal } from "@flatsby/validators/expenses/conversion";
import {
  CURRENCY_CODES,
  isCurrencyCode,
} from "@flatsby/validators/expenses/types";
import { useSplitwiseImport } from "@flatsby/validators/expenses/useSplitwiseImport";

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
          void queryClient.invalidateQueries(
            trpc.expense.getGroupDebts.queryOptions({ groupId }),
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
      expenses: wizard.expenses.map((exp) => ({
        ...exp,
        description: exp.description,
        category: exp.category,
      })),
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
          <DialogTitle>Import from Splitwise</DialogTitle>
          <DialogDescription>
            Upload a Splitwise CSV export to import expenses into this group.
          </DialogDescription>
        </DialogHeader>

        {bulkCreateMutation.data?.success ? (
          <div className="space-y-4">
            <Alert variant="success">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Import complete</AlertTitle>
              <AlertDescription>
                Successfully imported{" "}
                {bulkCreateMutation.data.data.importedCount} expenses.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
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
            error={
              bulkCreateMutation.isError
                ? bulkCreateMutation.error.message
                : bulkCreateMutation.data?.success === false
                  ? bulkCreateMutation.data.error.message
                  : null
            }
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
        <Label>CSV File</Label>
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
            <p className="text-sm font-medium">
              File loaded. Click or drop to replace.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Drag &amp; drop your CSV file here, or click to browse
            </p>
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
        <Label>Currency to import</Label>
        <Select
          value={wizard.currency}
          onValueChange={(val) => {
            if (isCurrencyCode(val)) wizard.setCurrency(val);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCY_CODES.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {wizard.parsed && (
        <div className="text-muted-foreground text-sm">
          Found {wizard.parsed.rows.length} rows and{" "}
          {wizard.parsed.personNames.length} people:{" "}
          {wizard.parsed.personNames.join(", ")}
        </div>
      )}

      {wizard.parsed?.errors.map((err, i) => (
        <Alert key={i} variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      ))}

      <DialogFooter>
        <Button
          disabled={!wizard.parsed || wizard.parsed.rows.length === 0}
          onClick={wizard.goToMapping}
        >
          Next
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
  members: { id: number; user: { name: string | null; email: string; image?: string | null } }[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Map each Splitwise person to a group member.
      </p>

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
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id.toString()}>
                  <div className="flex items-center gap-2">
                    <UserAvatar name={m.user.name ?? m.user.email} image={m.user.image} size="xs" />
                    {m.user.name ?? m.user.email}
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
          Back
        </Button>
        <Button disabled={!wizard.allNamesMapped} onClick={wizard.goToPreview}>
          Next
        </Button>
      </DialogFooter>
    </div>
  );
}

function StepPreview({ wizard }: { wizard: WizardReturn }) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {wizard.expenses.length} expenses to import
        {wizard.skipped.length > 0 && `, ${wizard.skipped.length} rows skipped`}
      </p>

      {wizard.expenses.length > 0 && (
        <div className="max-h-64 overflow-y-auto rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wizard.expenses.map((exp, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">
                    {exp.expenseDate.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-sm">
                    {exp.description}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {centsToDecimal(exp.amountInCents).toFixed(2)}{" "}
                    {exp.currency}
                  </TableCell>
                  <TableCell className="text-sm">
                    {exp.splitMethod === "settlement"
                      ? "Settlement"
                      : "Expense"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {wizard.skipped.length > 0 && (
        <details className="space-y-2">
          <summary className="text-muted-foreground cursor-pointer text-sm">
            {wizard.skipped.length} skipped rows
          </summary>
          <div className="max-h-32 overflow-y-auto rounded border p-2">
            {wizard.skipped.map((s, i) => (
              <div key={i} className="text-muted-foreground text-xs">
                Row {s.row}: {s.reason}
              </div>
            ))}
          </div>
        </details>
      )}

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={wizard.goBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          disabled={wizard.expenses.length === 0}
          onClick={wizard.goToConfirm}
        >
          Next
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
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      <Alert>
        <Upload className="h-4 w-4" />
        <AlertTitle>Ready to import</AlertTitle>
        <AlertDescription>
          {wizard.expenses.length} expenses will be created in this group. This
          action cannot be easily undone.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Import failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={wizard.goBack} disabled={isPending}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onImport} disabled={isPending}>
          {isPending ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {isPending
            ? "Importing..."
            : `Import ${wizard.expenses.length} expenses`}
        </Button>
      </DialogFooter>
    </div>
  );
}
