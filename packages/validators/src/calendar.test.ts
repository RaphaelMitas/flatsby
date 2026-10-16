import { describe, expect, it } from "vitest";

import { translatorFor } from "@flatsby/i18n/translator";

import type {
  CalendarItemView,
  CalendarRange,
  OccurrenceOverride,
  Recurrence,
} from "./calendar";
import {
  describeRecurrence,
  editedStartsOn,
  entriesOn,
  expandOccurrences,
  monthGrid,
  recurrenceOf,
  recurrenceSchema,
  repeatFormOf,
  shiftMonth,
  splitsSeries,
  withSavedItem,
  withSkipped,
  withSplitSeries,
} from "./calendar";

const item = (
  recurrence: Recurrence | null,
  startsOn = "2026-10-06",
  memberIds: number[] = [],
): CalendarItemView => ({
  id: 1,
  kind: "task",
  title: "Bins",
  time: null,
  startsOn,
  endsOn: null,
  recurrence,
  memberIds,
});

const done = (date: string, by = 1): OccurrenceOverride => ({
  date,
  skipped: false,
  completedByGroupMemberId: by,
  completedBy: { name: `Member ${by}`, image: null },
  completedAt: new Date(`${date}T12:00:00Z`),
});

const skipped = (date: string): OccurrenceOverride => ({
  date,
  skipped: true,
  completedByGroupMemberId: null,
  completedBy: null,
  completedAt: null,
});

const window = { from: "2026-10-01", to: "2026-10-31" };

const dates = (
  expandable: CalendarItemView,
  overrides: OccurrenceOverride[] = [],
) =>
  expandOccurrences(expandable, overrides, window.from, window.to).map(
    (o) => o.date,
  );

const rangeOf = (...items: CalendarItemView[]): CalendarRange => ({
  items,
  occurrences: items.flatMap((i) =>
    expandOccurrences(i, [], window.from, window.to),
  ),
});

describe("expandOccurrences", () => {
  it("places a one-off on its day only", () => {
    expect(dates(item(null))).toEqual(["2026-10-06"]);
  });

  it("repeats daily intervals from the start, not from the range", () => {
    expect(
      expandOccurrences(
        item({ type: "daily", interval: 3 }, "2026-10-01"),
        [],
        "2026-10-05",
        "2026-10-14",
      ).map((o) => o.date),
    ).toEqual(["2026-10-07", "2026-10-10", "2026-10-13"]);
  });

  it("repeats every other week on several weekdays", () => {
    // 2026-10-06 is a Tuesday
    expect(
      dates(item({ type: "weekly", interval: 2, days: ["mo", "th"] })),
    ).toEqual(["2026-10-08", "2026-10-19", "2026-10-22"]);
  });

  it("stops at the end of a split series", () => {
    expect(
      dates({
        ...item({ type: "weekly", interval: 1, days: ["tu"] }),
        endsOn: "2026-10-19",
      }),
    ).toEqual(["2026-10-06", "2026-10-13"]);
  });

  it("hides skipped occurrences and marks done ones", () => {
    const occurrences = expandOccurrences(
      item({ type: "weekly", interval: 1, days: ["tu"] }),
      [skipped("2026-10-13"), done("2026-10-20", 7)],
      window.from,
      window.to,
    );
    expect(
      occurrences.map((o) => [o.date, o.completedBy?.name ?? null]),
    ).toEqual([
      ["2026-10-06", null],
      ["2026-10-20", "Member 7"],
      ["2026-10-27", null],
    ]);
  });

  it("rotates turns by occurrence, counting a partial first week", () => {
    // Starts on a Wednesday, so Monday of that week never happened
    const rotating = item(
      { type: "weekly", interval: 1, days: ["mo", "we", "fr"] },
      "2026-10-07",
      [1, 2],
    );
    expect(
      expandOccurrences(rotating, [], "2026-10-07", "2026-10-12").map((o) => [
        o.date,
        o.turnGroupMemberId,
      ]),
    ).toEqual([
      ["2026-10-07", 1],
      ["2026-10-09", 2],
      ["2026-10-12", 1],
    ]);
  });
});

describe("recurrenceSchema", () => {
  it("sorts weekdays and caps weekly intervals at a year", () => {
    expect(
      recurrenceSchema.parse({
        type: "weekly",
        interval: 1,
        days: ["th", "mo", "th"],
      }),
    ).toEqual({ type: "weekly", interval: 1, days: ["mo", "th"] });
    expect(
      recurrenceSchema.safeParse({ type: "weekly", interval: 53, days: ["mo"] })
        .success,
    ).toBe(false);
  });
});

describe("describeRecurrence", () => {
  it("reads naturally in English and German", () => {
    const tuesdays: Recurrence = { type: "weekly", interval: 1, days: ["tu"] };
    const everyOther: Recurrence = {
      type: "weekly",
      interval: 2,
      days: ["fr"],
    };
    expect(describeRecurrence(tuesdays, translatorFor("en"), "en")).toBe(
      "Every Tuesday",
    );
    expect(describeRecurrence(tuesdays, translatorFor("de"), "de")).toBe(
      "Jeden Dienstag",
    );
    expect(describeRecurrence(everyOther, translatorFor("en"), "en")).toBe(
      "Every other Friday",
    );
    expect(
      describeRecurrence(
        { type: "daily", interval: 3 },
        translatorFor("en"),
        "en",
      ),
    ).toBe("Every 3 days");
  });
});

describe("repeat form", () => {
  it.each<Recurrence | null>([
    null,
    { type: "daily", interval: 1 },
    { type: "daily", interval: 10 },
    { type: "weekly", interval: 1, days: ["mo", "th"] },
    { type: "weekly", interval: 2, days: ["fr"] },
    { type: "weekly", interval: 3, days: ["sa"] },
  ])("round-trips %j", (recurrence) => {
    expect(recurrenceOf(repeatFormOf(recurrence), "2026-10-16")).toEqual(
      recurrence,
    );
  });
});

describe("monthGrid", () => {
  it("starts on the Monday before the 1st and spans six weeks", () => {
    const grid = monthGrid("2026-10");
    expect(grid.from).toBe("2026-09-28");
    expect(grid.to).toBe("2026-11-08");
    expect(grid.days).toHaveLength(42);
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("entriesOn", () => {
  it("keeps events and my turns under Mine", () => {
    const range = rangeOf(item(null, "2026-10-16", [2]), {
      ...item(null, "2026-10-16"),
      id: 2,
      kind: "event",
      title: "Plumber",
      time: "14:00",
    });
    expect(entriesOn(range, "2026-10-16").map((e) => e.item.title)).toEqual([
      "Plumber",
      "Bins",
    ]);
    expect(entriesOn(range, "2026-10-16", 1).map((e) => e.item.title)).toEqual([
      "Plumber",
    ]);
  });
});

describe("splitsSeries", () => {
  const weekly = item({ type: "weekly", interval: 1, days: ["mo"] });

  it("splits a running series when its rule changes from a later date", () => {
    expect(
      splitsSeries(weekly, {
        startsOn: "2026-10-20",
        recurrence: { type: "weekly", interval: 1, days: ["tu"] },
      }),
    ).toBe(true);
  });

  it("edits in place when only other fields change, the start moves back, or it never repeated", () => {
    expect(splitsSeries(weekly, weekly)).toBe(false);
    expect(
      splitsSeries(weekly, { startsOn: "2026-10-01", recurrence: null }),
    ).toBe(false);
    expect(
      splitsSeries(item(null), { startsOn: "2026-10-20", recurrence: null }),
    ).toBe(false);
  });
});

describe("optimistic patches", () => {
  const weekly = item(
    { type: "weekly", interval: 1, days: ["tu"] },
    undefined,
    [1, 2],
  );

  it("brings back an un-skipped occurrence with its turn", () => {
    const range = withSkipped(
      rangeOf(weekly),
      { itemId: 1, date: "2026-10-13", skipped: true },
      window,
    );
    expect(range.occurrences.map((o) => o.date)).not.toContain("2026-10-13");
    const restored = withSkipped(
      range,
      { itemId: 1, date: "2026-10-13", skipped: false },
      window,
    );
    expect(
      restored.occurrences.find((o) => o.date === "2026-10-13")
        ?.turnGroupMemberId,
    ).toBe(2);
  });

  it("keeps ticks on an edit that keeps the schedule and re-deals turns", () => {
    const range = {
      items: [weekly],
      occurrences: expandOccurrences(
        weekly,
        [done("2026-10-06")],
        window.from,
        window.to,
      ),
    };
    const edited = withSavedItem(
      range,
      { ...weekly, title: "Trash", memberIds: [2, 1] },
      window,
    );
    expect(edited.items[0]?.title).toBe("Trash");
    expect(
      edited.occurrences.map((o) => [o.turnGroupMemberId, !!o.completedAt]),
    ).toEqual([
      [2, true],
      [1, false],
      [2, false],
      [1, false],
    ]);
  });

  it("ends the old series the day before the new rule starts", () => {
    const next = {
      ...weekly,
      id: -1,
      startsOn: "2026-10-21",
      recurrence: { type: "weekly", interval: 1, days: ["we"] },
    } satisfies CalendarItemView;
    const split = withSplitSeries(rangeOf(weekly), 1, next, window);
    expect(split.items.find((i) => i.id === 1)?.endsOn).toBe("2026-10-20");
    expect(split.occurrences.map((o) => `${o.itemId}:${o.date}`)).toEqual([
      "1:2026-10-06",
      "1:2026-10-13",
      "1:2026-10-20",
      "-1:2026-10-21",
      "-1:2026-10-28",
    ]);
  });
});

describe("editedStartsOn", () => {
  const weekly = item({ type: "weekly", interval: 1, days: ["mo"] });
  const today = "2026-10-16";

  it("starts a changed repeat today and keeps the start when it is set back", () => {
    const changed = {
      ...repeatFormOf(weekly.recurrence),
      days: ["tu" as const],
    };
    expect(editedStartsOn(weekly, changed, null, today)).toBe(today);
    expect(
      editedStartsOn(weekly, repeatFormOf(weekly.recurrence), null, today),
    ).toBe(weekly.startsOn);
    expect(editedStartsOn(weekly, changed, "2026-11-02", today)).toBe(
      "2026-11-02",
    );
  });
});
