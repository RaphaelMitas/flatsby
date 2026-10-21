import type { DebtKind } from "@flatsby/validators/expenses/debt";
import type { DebtEntry } from "@flatsby/validators/expenses/types";

export const settleHref = (debt: DebtEntry, source: DebtKind) =>
  ({
    pathname: "/(tabs)/expenses/settle",
    params: {
      fromGroupMemberId: debt.fromGroupMemberId.toString(),
      toGroupMemberId: debt.toGroupMemberId.toString(),
      currency: debt.currency,
      amount: debt.amountInCents.toString(),
      source,
    },
  }) as const;
