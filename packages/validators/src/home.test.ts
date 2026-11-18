import { describe, expect, it } from "vitest";

import { monthPace, paceChart, paceSummary, paceWindow } from "./home";

describe("monthPace", () => {
  it("puts each day in its month and drops what lies outside both", () => {
    const pace = monthPace(
      [
        { day: "2026-09-30", total: 99 },
        { day: "2026-10-01", total: 5 },
        { day: "2026-10-31", total: 7 },
        { day: "2026-11-01", total: 2 },
        { day: "2026-11-18", total: 3 },
        { day: "2026-11-19", total: 99 },
      ],
      "2026-11-18",
    );

    expect(pace.current).toHaveLength(18);
    expect(pace.previous).toHaveLength(31);
    expect(paceSummary(pace)).toEqual({
      total: 5,
      difference: 0,
      direction: "same",
    });
    expect(pace.previous[30]).toBe(7);
  });

  it("compares the end of a long month with the whole shorter one before", () => {
    const pace = monthPace(
      [
        { day: "2027-02-28", total: 10 },
        { day: "2027-03-31", total: 4 },
      ],
      "2027-03-31",
    );

    expect(pace.previous).toHaveLength(28);
    expect(paceSummary(pace)).toEqual({
      total: 4,
      difference: -6,
      direction: "less",
    });
  });

  it("reaches back across the new year", () => {
    expect(paceWindow("2027-01-05")).toEqual({
      from: "2026-12-01",
      to: "2027-01-05",
    });
  });
});

describe("paceChart", () => {
  it("ends this month's line on today and scales the days to this month", () => {
    const pace = monthPace(
      [
        { day: "2026-11-01", total: 10 },
        { day: "2026-12-01", total: 5 },
      ],
      "2026-12-16",
    );

    const chart = paceChart(pace, "2026-12-16", { width: 300, height: 100 });

    expect(chart.end).toEqual({ x: 150, y: 50 });
    expect(chart.beforeEnd).toEqual({ x: 290, y: 0 });
  });

  it("leaves out the days last month had and this one does not", () => {
    const pace = monthPace([{ day: "2026-10-31", total: 10 }], "2026-11-30");

    const chart = paceChart(pace, "2026-11-30", { width: 290, height: 100 });

    expect(chart.end).toEqual({ x: 290, y: 100 });
    expect(chart.beforeEnd).toEqual({ x: 290, y: 100 });
  });

  it("draws a flat line for a month with nothing in it", () => {
    const chart = paceChart(monthPace([], "2026-11-03"), "2026-11-03", {
      width: 300,
      height: 100,
    });

    expect(chart.now).toBe("M0,100 C6.9,100 13.8,100 20.7,100");
  });

  it("glides between the days something happened without overshooting them", () => {
    const pace = monthPace(
      [
        { day: "2026-11-02", total: 40 },
        { day: "2026-11-03", total: 5 },
        { day: "2026-11-06", total: 55 },
      ],
      "2026-11-08",
    );

    const { now } = paceChart(pace, "2026-11-08", { width: 290, height: 100 });
    const heights = [...now.matchAll(/,(-?[\d.]+)/g)].map(([, y]) => Number(y));

    expect(now).toContain("C");
    expect(heights).toEqual([...heights].sort((a, b) => b - a));
  });
});
