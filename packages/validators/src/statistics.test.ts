import { describe, expect, it } from "vitest";

import type { Statistics } from "./statistics";
import { paceSummary } from "./home";
import {
  barHeights,
  convertedShares,
  daysOnList,
  isStatisticsEmpty,
  spendingStatistics,
  statisticsPeriod,
  statisticsWindow,
} from "./statistics";

const month = (range: string, today: string) => {
  const period = statisticsPeriod(range, today, "2020-01-01");
  if (!period) throw new Error(`${range} is not shown on ${today}`);
  return period;
};

describe("statisticsPeriod", () => {
  it("takes last month and the last three months across the new year", () => {
    expect(statisticsPeriod("2026-12", "2027-01-15", "2020-01-01")).toEqual({
      from: "2026-12-01",
      to: "2026-12-31",
      today: "2027-01-15",
      pace: "wholeMonth",
    });
    expect(
      statisticsPeriod("last3Months", "2027-01-15", "2020-01-01"),
    ).toMatchObject({ from: "2026-11-01", to: "2027-01-15", pace: null });
  });

  it("takes only the six months shown", () => {
    expect(
      statisticsPeriod("2026-08", "2027-01-15", "2020-01-01"),
    ).toMatchObject({ from: "2026-08-01", to: "2026-08-31" });
    expect(statisticsPeriod("2026-07", "2027-01-15", "2020-01-01")).toBeNull();
    expect(statisticsPeriod("2027-02", "2027-01-15", "2020-01-01")).toBeNull();
  });

  it("ignores a recent join date except for since joined", () => {
    expect(
      statisticsPeriod("thisYear", "2026-11-19", "2026-11-10"),
    ).toMatchObject({ from: "2026-01-01", to: "2026-11-19", pace: null });
    expect(statisticsPeriod("2026-11", "2026-11-19", "2026-11-10")?.from).toBe(
      "2026-11-01",
    );
    expect(
      statisticsPeriod("sinceJoined", "2026-11-19", "2026-11-10")?.from,
    ).toBe("2026-11-10");
  });

  it("covers six months in the window even for a short range", () => {
    expect(statisticsWindow(month("2027-02", "2027-02-10"))).toEqual({
      from: "2026-09-01",
      to: "2027-02-10",
    });
  });

  it("reaches one month further back to compare the oldest month shown", () => {
    expect(statisticsWindow(month("2026-09", "2027-02-10"))).toEqual({
      from: "2026-08-01",
      to: "2027-02-10",
    });
  });
});

describe("convertedShares", () => {
  const expense = {
    day: "2026-11-03",
    subcategory: "groceries",
    amountInCents: 1000,
    currency: "USD",
    convertedAmountInCents: 920,
    convertedCurrency: "EUR",
    expenseSplits: [
      { groupMemberId: 1, amountInCents: 333 },
      { groupMemberId: 2, amountInCents: 333 },
      { groupMemberId: 3, amountInCents: 334 },
    ],
  };

  it("gives the leftover cent to the largest remainder", () => {
    const shareOf = (groupMemberId: number) =>
      convertedShares([expense], groupMemberId)[0]?.share;

    expect([shareOf(1), shareOf(2), shareOf(3)]).toEqual([307, 306, 307]);
  });

  it("gives a member outside the split nothing", () => {
    expect(convertedShares([expense], 4)[0]?.share).toBe(0);
  });
});

describe("spendingStatistics", () => {
  const period = month("2026-11", "2026-11-19");

  it("counts a category the member has no share in for the household only", () => {
    const spending = spendingStatistics(
      [{ day: "2026-11-04", subcategory: "rent", household: 800, share: 0 }],
      period,
    );
    expect(spending.household).toBe(800);
    expect(spending.categories).toEqual([]);
  });

  it("compares a whole month with the whole longer month before", () => {
    const { pace } = spendingStatistics(
      [
        { day: "2027-01-31", subcategory: "rent", household: 6, share: 6 },
        { day: "2027-02-10", subcategory: "rent", household: 4, share: 4 },
      ],
      month("2027-02", "2027-03-05"),
    );

    expect(pace?.previous).toHaveLength(28);
    expect(pace && paceSummary(pace)).toEqual({
      total: 4,
      difference: -2,
      direction: "less",
    });
  });

  it("keeps the same six months when an older month is picked", () => {
    const spending = spendingStatistics(
      [
        { day: "2026-08-02", subcategory: "rent", household: 300, share: 100 },
        { day: "2026-11-04", subcategory: "rent", household: 90, share: 30 },
      ],
      month("2026-08", "2026-11-19"),
    );

    expect(spending.share).toBe(100);
    expect(spending.months.map(({ household }) => household)).toEqual([
      0, 0, 300, 0, 0, 90,
    ]);
  });

  it("zero-fills six months ending today and leaves out later days", () => {
    const spending = spendingStatistics(
      [
        { day: "2026-05-31", subcategory: "rent", household: 99, share: 99 },
        { day: "2026-08-02", subcategory: "rent", household: 300, share: 100 },
        { day: "2026-11-20", subcategory: "rent", household: 99, share: 99 },
      ],
      period,
    );

    expect(spending.months).toEqual([
      { month: "2026-06", share: 0, household: 0 },
      { month: "2026-07", share: 0, household: 0 },
      { month: "2026-08", share: 100, household: 300 },
      { month: "2026-09", share: 0, household: 0 },
      { month: "2026-10", share: 0, household: 0 },
      { month: "2026-11", share: 0, household: 0 },
    ]);
    expect(spending.household).toBe(0);
  });
});

describe("isStatisticsEmpty", () => {
  const statistics = (household: number, lastMonth: number): Statistics => ({
    wholeMonth: false,
    from: "2026-01-01",
    to: "2026-11-19",
    spending: {
      share: 0,
      household,
      pace: null,
      categories: [],
      months: [{ month: "2026-11", share: 0, household: 0 }],
    },
    shopping: {
      total: 0,
      pace: null,
      months: [{ month: "2026-11", total: lastMonth, categories: {} }],
      categories: [],
      daysOnList: null,
    },
    chores: {
      total: 0,
      pace: null,
      months: [{ month: "2026-11", total: 0 }],
      titles: [],
    },
  });

  it("keeps a range total that lies before the months shown", () => {
    expect(isStatisticsEmpty(statistics(1200, 0))).toBe(false);
  });

  it("keeps month bars when the range itself is empty", () => {
    expect(isStatisticsEmpty(statistics(0, 3))).toBe(false);
  });

  it("is empty when there is nothing at all", () => {
    expect(isStatisticsEmpty(statistics(0, 0))).toBe(true);
  });
});

describe("daysOnList", () => {
  it("needs five items and rounds up to at least a day", () => {
    expect(daysOnList({ items: 4, medianDays: 3 })).toBeNull();
    expect(daysOnList({ items: 5, medianDays: 0.01 })).toBe(1);
    expect(daysOnList({ items: 5, medianDays: 2.2 })).toBe(3);
  });
});

describe("barHeights", () => {
  it("draws nothing when every value is zero", () => {
    expect(barHeights([0, 0, 0], 80)).toEqual([0, 0, 0]);
  });
});
