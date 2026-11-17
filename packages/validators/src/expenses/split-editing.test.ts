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

describe("expenseFormSchema", () => {
  it("re-splits an equal split when the amount changed after splitting", () => {
    const parsed = expenseFormSchema.safeParse(
      formValues("equal", 9000, [split(1, 4230), split(2, 4230)]),
    );
    expect(parsed.data?.splits.map((s) => s.amountInCents)).toEqual([
      4500, 4500,
    ]);
  });

  it("rejects a custom split that no longer matches the amount", () => {
    const parsed = expenseFormSchema.safeParse(
      formValues("custom", 9000, [split(1, 4230), split(2, 4230)]),
    );
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.path).toEqual(["splits"]);
  });
});
