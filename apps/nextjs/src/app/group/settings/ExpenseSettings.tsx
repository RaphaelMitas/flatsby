"use client";

import type { GroupWithAccess } from "@flatsby/api";
import type { CurrencyCode } from "@flatsby/validators/expenses/types";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { AlertCircle, CircleCheckBig, LoaderCircle } from "lucide-react";

import { cn } from "@flatsby/ui";
import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import { Label } from "@flatsby/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";
import { Switch } from "@flatsby/ui/switch";
import { CURRENCY_CODES } from "@flatsby/validators/expenses/types";

import { useTRPC } from "~/trpc/react";
import { useHandleApiError } from "~/utils";

const ExpenseSettings = ({ groupId }: { groupId: number }) => {
  const trpc = useTRPC();
  const handleApiError = useHandleApiError();

  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  if (!group.success) {
    return handleApiError(group.error);
  }

  return <ExpenseSettingsForm key={groupId} group={group.data} />;
};

function ExpenseSettingsForm({ group }: { group: GroupWithAccess }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isAdmin = group.thisGroupMember.role === "admin";
  const savedConvert = group.convertAutomatically === true;
  const highlightConvert =
    useSearchParams().get("highlight") === "convert" && isAdmin;

  const [currency, setCurrency] = useState<CurrencyCode>(group.currency);
  const [convertAutomatically, setConvertAutomatically] = useState(
    savedConvert || highlightConvert,
  );
  const convertRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightConvert) {
      convertRowRef.current?.scrollIntoView({ block: "center" });
    }
  }, [highlightConvert]);

  const groupMutation = useMutation(
    trpc.group.updateGroup.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          return;
        }

        void queryClient.invalidateQueries(
          trpc.group.getGroup.queryOptions({ id: group.id }),
        );
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUserWithGroups.queryOptions(),
        );
      },
    }),
  );

  const isConvertDirty = convertAutomatically !== savedConvert;
  const changes = {
    ...(currency !== group.currency && { currency }),
    ...(isConvertDirty && { convertAutomatically }),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses</CardTitle>
        <CardDescription>
          The currency debts are kept in, and how other currencies are handled.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="group-currency">Group currency</Label>
            <Select
              value={currency}
              onValueChange={(value) => {
                const code = CURRENCY_CODES.find((c) => c === value);
                if (code) setCurrency(code);
              }}
              disabled={!isAdmin}
            >
              <SelectTrigger
                id="group-currency"
                className="w-full md:w-48"
                data-testid="group-currency-select"
              >
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
            {currency !== group.currency && (
              <p className="text-warning text-sm">
                Expenses already converted stay in {group.currency}.
              </p>
            )}
          </div>
          <div
            ref={convertRowRef}
            className={cn(
              "flex items-start justify-between gap-4 rounded-lg",
              highlightConvert && isConvertDirty && "border-primary border p-3",
            )}
          >
            <div className="grid gap-1">
              <Label htmlFor="convert-automatically">
                Convert automatically
              </Label>
              <p className="text-muted-foreground text-sm">
                New expenses in other currencies are converted to {currency}.
                You can keep the original currency on any single expense.
                Existing expenses don&apos;t change.
              </p>
            </div>
            <Switch
              id="convert-automatically"
              checked={convertAutomatically}
              onCheckedChange={setConvertAutomatically}
              disabled={!isAdmin}
              data-testid="group-convert-switch"
            />
          </div>
          <Button
            className="w-full md:w-fit md:min-w-40"
            data-testid="expense-settings-save"
            disabled={
              groupMutation.isPending ||
              !isAdmin ||
              Object.keys(changes).length === 0
            }
            onClick={() => groupMutation.mutate({ id: group.id, ...changes })}
          >
            {groupMutation.isPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : !isAdmin ? (
              "not an admin"
            ) : (
              "Save"
            )}
          </Button>
          {(groupMutation.isError || groupMutation.data?.success === false) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {groupMutation.data?.success === false
                  ? groupMutation.data.error.type
                  : (groupMutation.error?.data?.code ?? "Unknown error")}
              </AlertTitle>
              <AlertDescription>
                {groupMutation.data?.success === false
                  ? groupMutation.data.error.message
                  : (groupMutation.error?.message ??
                    "unknown error while saving")}
              </AlertDescription>
            </Alert>
          )}
          {groupMutation.isSuccess && groupMutation.data.success && (
            <Alert variant="success">
              <CircleCheckBig className="h-4 w-4" />
              <AlertTitle>Expense settings saved</AlertTitle>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ExpenseSettings;
