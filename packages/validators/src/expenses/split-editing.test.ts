import { describe, expect, it } from "vitest";

import type { ExpenseSplit } from "./types";
import {
  expenseFormSchema,
  restShares,
  splitEditor,
  splitRemaining,
} from "./split-editing";

const split = (
  groupMemberId: number,
  amountInCents = 0,
  percentage: number | null = null,
): ExpenseSplit => ({ groupMemberId, amountInCents, percentage });

function editorOn(
  initial: ExpenseSplit[],
  method: "custom" | "percentage",
  totalAmountCents: number,
  conversion: {
    convertedAmountInCents?: number;
    convertedCurrency?: string;
  } = {},
) {
  let splits = initial;
  const editor = () =>
    splitEditor({
      splits,
      getSplits: () => splits,
      setSplits: (next) => {
        splits = next;
      },
      method,
      onMethodChange: () => undefined,
      totalAmountCents,
      currency: "USD",
      locale: "en",
      conversion,
    });
  return { editor, current: () => splits };
}

const formValues = (
  splitMethod: "equal" | "custom",
  amountInCents: number,
  splits: ExpenseSplit[],
) => ({
  paidByGroupMemberId: 1,
  amountInCents,
  currency: "EUR",
  description: "REWE",
  expenseDate: new Date("2026-11-17"),
  splitMethod,
  splits,
});

describe("splitRemaining", () => {
  it("counts down cents for a custom split", () => {
    expect(
      splitRemaining("custom", [split(1, 3000), split(2, 2230)], 8460),
    ).toBe(3230);
  });

  it("counts down basis points for a percentage split", () => {
    expect(
      splitRemaining(
        "percentage",
        [split(1, 0, 4000), split(2, 0, 2500)],
        8460,
      ),
    ).toBe(3500);
  });

  it("is negative when too much is assigned", () => {
    expect(splitRemaining("custom", [split(1, 9000)], 8460)).toBe(-540);
  });
});

describe("restShares", () => {
  it("offers what is left to the empty rows only", () => {
    const shares = restShares(
      "custom",
      [split(1, 3000), split(2, 2230), split(3), split(4)],
      8461,
    );
    expect([...shares]).toEqual([
      [3, 1616],
      [4, 1615],
    ]);
  });

  it("spreads over everyone when no row is empty", () => {
    const shares = restShares("custom", [split(1, 3000), split(2, 2230)], 8460);
    expect([...shares]).toEqual([
      [1, 1615],
      [2, 1615],
    ]);
  });

  it("offers nothing once the split is over the total", () => {
    expect(restShares("custom", [split(1, 9000), split(2)], 8460).size).toBe(0);
  });
});

describe("splitEditor.splitRest", () => {
  it("fills the empty rows so a custom split adds up", () => {
    const { editor, current } = editorOn(
      [split(1, 3000), split(2, 2230), split(3), split(4)],
      "custom",
      8460,
    );
    editor().splitRest();
    expect(current().map((s) => s.amountInCents)).toEqual([
      3000, 2230, 1615, 1615,
    ]);
    expect(editor().remaining).toBe(0);
    expect(editor().validation.isValid).toBe(true);
  });

  it("fills the empty percentages and recomputes the amounts", () => {
    const { editor, current } = editorOn(
      [split(1, 0, 4000), split(2, 0, 2500), split(3)],
      "percentage",
      10000,
    );
    editor().splitRest();
    expect(current().map((s) => s.percentage)).toEqual([4000, 2500, 3500]);
    expect(current().map((s) => s.amountInCents)).toEqual([4000, 2500, 3500]);
  });
});

describe("splitEditor status", () => {
  it("says what is left of the total while a custom split is short", () => {
    const { status, canSplitRest } = editorOn(
      [split(1, 3000), split(2)],
      "custom",
      8460,
    ).editor();
    expect(status.primary).toEqual({
      key: "expenses.splitLeft",
      values: { amount: "$54.60" },
    });
    expect(status.secondary?.values).toEqual({ total: "$84.60" });
    expect(canSplitRest).toBe(true);
  });

  it("turns destructive once more than the total is assigned", () => {
    const { status, canSplitRest } = editorOn(
      [split(1, 5000), split(2, 5000)],
      "custom",
      8460,
    ).editor();
    expect(status.primary.key).toBe("expenses.splitOver");
    expect(status.tone).toBe("destructive");
    expect(canSplitRest).toBe(false);
  });

  it("counts percent, and offers no rest once rounding makes it complete", () => {
    const { status, canSplitRest } = editorOn(
      [split(1, 0, 3333), split(2, 0, 3333), split(3, 0, 3333)],
      "percentage",
      9000,
    ).editor();
    expect(status.primary).toEqual({
      key: "expenses.splitAddsUp",
      values: { total: "100%" },
    });
    expect(canSplitRest).toBe(false);
  });

  it("asks for a person instead of offering the rest when nobody is in", () => {
    const { status, canSplitRest } = editorOn([], "custom", 8460).editor();
    expect(status.primary.key).toBe("expenses.validation.atLeastOnePerson");
    expect(status.tone).toBe("destructive");
    expect(canSplitRest).toBe(false);
  });
});

describe("splitEditor rows", () => {
  const converted = { convertedAmountInCents: 9000, convertedCurrency: "EUR" };

  it("hides converted amounts until the split adds up", () => {
    const { rows } = editorOn(
      [split(1, 1000), split(2)],
      "custom",
      10000,
      converted,
    ).editor();
    expect(rows.get(1)?.converted).toBeUndefined();
  });

  it("shows each share of the converted total once it adds up", () => {
    const { rows } = editorOn(
      [split(1, 2500), split(2, 7500)],
      "custom",
      10000,
      converted,
    ).editor();
    expect(rows.get(1)?.detail).toBe("€22.50");
    expect(rows.get(2)?.detail).toBe("€67.50");
  });

  it("previews an even share of what is left in the empty rows", () => {
    const { rows } = editorOn(
      [split(1, 3000), split(2), split(3)],
      "custom",
      8460,
    ).editor();
    expect(rows.get(2)?.placeholder).toBe("27.30");
    expect(rows.get(1)?.placeholder).toBe("0.00");
  });
});

describe("expenseFormSchema", () => {
  it("re-splits an equal split when the amount changed after splitting", () => {
    const parsed = expenseFormSchema.safeParse(
      formValues("equal", 9000, [split(1, 4230), split(2, 4230)]),
    );
    expect(parsed.data?.splits.map((s) => s.amountInCents)).toEqual([
      4500, 4500,
    ]);
  });

  it("leaves out the people a custom split gives nothing", () => {
    const parsed = expenseFormSchema.safeParse(
      formValues("custom", 9000, [split(1, 9000), split(2)]),
    );
    expect(parsed.data?.splits.map((s) => s.groupMemberId)).toEqual([1]);
  });

  it("rejects a custom split that no longer matches the amount", () => {
    const parsed = expenseFormSchema.safeParse(
      formValues("custom", 9000, [split(1, 4230), split(2, 4230)]),
    );
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.path).toEqual(["splits"]);
  });
});
