"use client";

import type { GroupWithAccess } from "@flatsby/api";
import type { CurrencyCode } from "@flatsby/validators/expenses/types";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";

import { cn } from "@flatsby/ui";
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
import {
  CURRENCY_CODES,
  isCurrencyCode,
} from "@flatsby/validators/expenses/types";

import { useUpdateGroup } from "~/hooks/use-update-group";
import { useTRPC } from "~/trpc/react";
import { useHandleApiError } from "~/utils";
import { UpdateGroupAlert } from "./UpdateGroupAlert";

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
  const isAdmin = group.thisGroupMember.role === "admin";
  const highlightConvert =
    useSearchParams().get("highlight") === "convert" && isAdmin;

  // Saving diffs against what this admin opened, so another admin's change in between isn't sent back
  const [opened, setOpened] = useState({
    currency: group.currency,
    convertAutomatically: group.convertAutomatically === true,
  });
  const [currency, setCurrency] = useState<CurrencyCode>(opened.currency);
  const [convertAutomatically, setConvertAutomatically] = useState(
    opened.convertAutomatically || highlightConvert,
  );
  const convertRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightConvert) {
      convertRowRef.current?.scrollIntoView({ block: "center" });
    }
  }, [highlightConvert]);

  const groupMutation = useUpdateGroup(group.id);

  const isConvertDirty = convertAutomatically !== opened.convertAutomatically;
  const changes = {
    ...(currency !== opened.currency && { currency }),
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
                if (isCurrencyCode(value)) setCurrency(value);
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
            onClick={() =>
              groupMutation.mutate(
                { id: group.id, ...changes },
                {
                  onSuccess: (data) => {
                    if (data.success) {
                      setOpened({ currency, convertAutomatically });
                    }
                  },
                },
              )
            }
          >
            {groupMutation.isPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : !isAdmin ? (
              "not an admin"
            ) : (
              "Save"
            )}
          </Button>
          <UpdateGroupAlert
            mutation={groupMutation}
            successTitle="Expense settings saved"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default ExpenseSettings;
