"use client";

import type { GroupWithAccess } from "@flatsby/api";
import type { ExpenseValues } from "@flatsby/validators/expenses/schemas";
import type { EditableSplitMethod } from "@flatsby/validators/expenses/split-editing";
import type { LucideIcon } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Divide, DollarSign, Equal, Minus, Percent, Plus } from "lucide-react";
import { useWatch } from "react-hook-form";

import { Avatar, AvatarFallback, AvatarImage } from "@flatsby/ui/avatar";
import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import { Input } from "@flatsby/ui/input";
import { Separator } from "@flatsby/ui/separator";
import {
  formatCurrencyFromCents,
  formatShareCount,
} from "@flatsby/validators/expenses/formatting";
import { splitEditor } from "@flatsby/validators/expenses/split-editing";

import { CurrencyInput } from "~/components/CurrencyInput";

const SPLIT_METHOD_OPTIONS = [
  { method: "equal", label: "Equal", Icon: Equal },
  { method: "percentage", label: "Percentage", Icon: Percent },
  { method: "shares", label: "Shares", Icon: Divide },
  { method: "custom", label: "Custom", Icon: DollarSign },
] as const satisfies readonly {
  method: EditableSplitMethod;
  label: string;
  Icon: LucideIcon;
}[];

interface SplitEditorProps {
  form: UseFormReturn<ExpenseValues>;
  groupMembers: GroupWithAccess["groupMembers"];
  totalAmountCents: number;
  currency: string;
  splitMethod: EditableSplitMethod;
  onSplitMethodChange: (method: EditableSplitMethod) => void;
}

export function SplitEditor({
  form,
  groupMembers,
  totalAmountCents,
  currency,
  splitMethod,
  onSplitMethodChange,
}: SplitEditorProps) {
  const splits = useWatch({ control: form.control, name: "splits" });
  const selectedMemberIds = splits.map((s) => s.groupMemberId);
  const {
    validation,
    totalSplitCents,
    totalShares,
    changeMethod,
    toggleMember,
    setPercentage,
    setShares,
    setAmount,
  } = splitEditor({
    splits,
    getSplits: () => form.getValues("splits"),
    setSplits: (next) =>
      form.setValue("splits", next, { shouldValidate: true }),
    method: splitMethod,
    onMethodChange: onSplitMethodChange,
    totalAmountCents,
  });

  return (
    <div className="space-y-4">
      <div className="@container">
        <div className="grid grid-cols-2 gap-2 @md:flex">
          {SPLIT_METHOD_OPTIONS.map(({ method, label, Icon }) => (
            <Button
              key={method}
              type="button"
              variant={splitMethod === method ? "default" : "outline"}
              size="sm"
              onClick={() => changeMethod(method)}
              className="grow"
              data-testid={`split-method-${method}`}
            >
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select People</CardTitle>
          <CardDescription>
            Choose who should be included in this expense
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {groupMembers.map((member) => {
              const isSelected = selectedMemberIds.includes(member.id);
              return (
                <Button
                  key={member.id}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => toggleMember(member.id)}
                  className="flex h-auto flex-col items-center gap-2 py-3"
                  data-testid={`split-member-${member.id}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      alt={member.user.name}
                      src={member.user.image ?? ""}
                    />
                    <AvatarFallback className="text-muted-foreground bg-muted text-xs">
                      {member.user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="w-full truncate text-xs">
                    {member.user.name}
                  </span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {splits.length > 0 && (
        <Card data-testid="split-details-card">
          <CardHeader>
            <CardTitle className="text-base">Split Details</CardTitle>
            <CardDescription>
              {splitMethod === "equal" && "Amounts are split equally"}
              {splitMethod === "percentage" &&
                "Enter percentage for each person (must sum to 100%)"}
              {splitMethod === "shares" &&
                `Enter shares for each person (${totalShares} total)`}
              {splitMethod === "custom" &&
                `Enter amounts (must sum to ${formatCurrencyFromCents({ cents: totalAmountCents, currency })})`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {splits.map((split, index) => {
              const member = groupMembers.find(
                (m) => m.id === split.groupMemberId,
              );
              const memberName = member?.user.name ?? "Unknown";
              const shares = split.shares ?? 0;

              return (
                <div key={split.groupMemberId} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        alt={memberName}
                        src={member?.user.image ?? undefined}
                      />
                      <AvatarFallback className="text-xs">
                        {memberName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm font-medium">
                      {memberName}
                    </span>
                    <span className="text-sm font-semibold">
                      {formatCurrencyFromCents({
                        cents: split.amountInCents,
                        currency,
                      })}
                    </span>
                  </div>

                  {splitMethod === "percentage" && (
                    <div className="flex items-center gap-2">
                      <CurrencyInput
                        value={split.percentage ?? 0}
                        onChange={(basisPoints) =>
                          setPercentage(index, basisPoints)
                        }
                        placeholder="0.00"
                        min={0}
                        max={10000}
                        className="flex-1"
                        data-testid={`split-member-amount-${split.groupMemberId}`}
                      />
                      <span className="text-muted-foreground text-sm">%</span>
                    </div>
                  )}

                  {splitMethod === "shares" && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setShares(index, shares - 1)}
                        disabled={shares <= 1}
                        aria-label={`Fewer shares for ${memberName}`}
                        data-testid={`split-member-shares-decrement-${split.groupMemberId}`}
                      >
                        <Minus />
                      </Button>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={shares === 0 ? "" : shares}
                        onChange={(e) =>
                          setShares(
                            index,
                            Number.parseInt(e.target.value, 10) || 0,
                          )
                        }
                        className="w-16 text-center"
                        aria-label={`Shares for ${memberName}`}
                        data-testid={`split-member-shares-${split.groupMemberId}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setShares(index, shares + 1)}
                        aria-label={`More shares for ${memberName}`}
                        data-testid={`split-member-shares-increment-${split.groupMemberId}`}
                      >
                        <Plus />
                      </Button>
                      <span className="text-muted-foreground text-sm">
                        of {formatShareCount(totalShares)}
                      </span>
                    </div>
                  )}

                  {splitMethod === "custom" && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">
                        {currency}
                      </span>
                      <CurrencyInput
                        value={split.amountInCents}
                        onChange={(cents) => setAmount(index, cents)}
                        placeholder="0.00"
                        min={0}
                        max={totalAmountCents}
                        className="flex-1"
                        data-testid={`split-member-amount-${split.groupMemberId}`}
                      />
                    </div>
                  )}

                  {index < splits.length - 1 && <Separator className="mt-2" />}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {splits.length > 0 && (
        <div className="text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total:</span>
            <span
              className={`font-semibold ${validation.isValid ? "" : "text-destructive"}`}
            >
              {formatCurrencyFromCents({ cents: totalSplitCents, currency })}
            </span>
          </div>
          {!validation.isValid && validation.error && (
            <p className="text-destructive mt-1 text-xs">{validation.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
