import { describe, expect, it } from "vitest";

import { localDateIn } from "./calendar";
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

  it("compares a whole month with the whole month before", () => {
    const pace = monthPace(
      [
        { day: "2027-01-31", total: 6 },
        { day: "2027-02-10", total: 4 },
      ],
      "2027-02-28",
    );

    expect(paceSummary(pace, true)).toEqual({
      total: 4,
      difference: -2,
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

function drawnHeights(path: string) {
  const heights: number[] = [];
  for (const [, command, rest = ""] of path.matchAll(/([MLC])([^MLCZ]*)/g)) {
    const numbers = rest.trim().split(/[ ,]+/).map(Number);
    const from = heights.at(-1) ?? 0;
    const [, leave = 0, , arrive = 0, , to = 0] = numbers;
    if (command !== "C") heights.push(numbers[1] ?? 0);
    else
      for (let step = 1; step <= 10; step++) {
        const t = step / 10;
        heights.push(
          (1 - t) ** 3 * from +
            3 * (1 - t) ** 2 * t * leave +
            3 * (1 - t) * t ** 2 * arrive +
            t ** 3 * to,
        );
      }
  }
  return heights;
}

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
      width: 290,
      height: 100,
    });

    expect(chart.now).toBe("M0,100L20,100");
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
    const heights = drawnHeights(now);

    expect(now).toContain("C");
    expect(
      heights.every((y, i) => i === 0 || y <= (heights[i - 1] ?? y) + 0.001),
    ).toBe(true);
  });
});

describe("localDateIn", () => {
  it("gives the calendar day of that zone, not of the server", () => {
    const lateEvening = new Date("2026-11-30T23:30:00Z");

    expect(localDateIn("Europe/Berlin", lateEvening)).toBe("2026-12-01");
    expect(localDateIn("America/Los_Angeles", lateEvening)).toBe("2026-11-30");
  });
});
