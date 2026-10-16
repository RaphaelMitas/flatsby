import { describe, expect, it } from "vitest";

import { translatorFor } from "@flatsby/i18n/translator";

import type {
  ExpandableItem,
  OccurrenceOverride,
  Recurrence,
} from "./calendar";
import {
  canComplete,
  describeRecurrence,
  entriesOn,
  expandOccurrences,
  isScheduledOn,
  monthGrid,
  recurrenceOf,
  recurrenceSchema,
  repeatFormOf,
  shiftMonth,
  turnOn,
  weekdayOf,
  withDone,
  withRescheduled,
  withSavedItem,
} from "./calendar";

const item = (
  recurrence: Recurrence | null,
  startsOn = "2026-10-06",
  memberIds: number[] = [],
): ExpandableItem => ({ id: 1, startsOn, recurrence, memberIds });

const done = (originalDate: string, by = 1): OccurrenceOverride => ({
  originalDate,
  movedTo: null,
  skipped: false,
  completedByGroupMemberId: by,
  completedAt: new Date(`${originalDate}T12:00:00Z`),
});

const dates = (
  expandable: ExpandableItem,
  from: string,
  to: string,
  overrides: OccurrenceOverride[] = [],
  today = "2026-10-16",
) =>
  expandOccurrences(expandable, overrides, from, to, today).map((o) => o.date);

describe("expandOccurrences", () => {
  it("places a one-off on its day only", () => {
    expect(dates(item(null), "2026-10-01", "2026-10-31")).toEqual([
      "2026-10-06",
    ]);
  });

  it("repeats daily intervals from the start, not from the range", () => {
    expect(
      dates(
        item({ type: "daily", interval: 3 }, "2026-10-01"),
        "2026-10-05",
        "2026-10-14",
      ),
    ).toEqual(["2026-10-07", "2026-10-10", "2026-10-13"]);
  });

  it("repeats every other week on several weekdays", () => {
    // 2026-10-06 is a Tuesday
    expect(
      dates(
        item({ type: "weekly", interval: 2, days: ["mo", "th"] }),
        "2026-10-01",
        "2026-10-31",
      ),
    ).toEqual(["2026-10-08", "2026-10-19", "2026-10-22"]);
  });

  it("drops skipped occurrences and shows moved ones on their new day", () => {
    const weekly = item({ type: "weekly", interval: 1, days: ["tu"] });
    const overrides: OccurrenceOverride[] = [
      { ...done("2026-10-13"), completedAt: null, skipped: true },
      {
        ...done("2026-10-20"),
        completedAt: null,
        completedByGroupMemberId: null,
        movedTo: "2026-10-22",
      },
    ];
    expect(dates(weekly, "2026-10-01", "2026-10-31", overrides)).toEqual([
      "2026-10-06",
      "2026-10-22",
      "2026-10-27",
    ]);
  });

  it("rotates turns by occurrence, whoever actually did it", () => {
    const weekly = item(
      { type: "weekly", interval: 1, days: ["tu"] },
      undefined,
      [10, 20, 30],
    );
    const occurrences = expandOccurrences(
      weekly,
      [done("2026-10-06", 30)],
      "2026-10-01",
      "2026-10-31",
      "2026-10-16",
    );
    expect(occurrences.map((o) => o.turnGroupMemberId)).toEqual([
      10, 20, 30, 10,
    ]);
    expect(occurrences[0]?.completedByGroupMemberId).toBe(30);
  });

  it("counts turns across a partial first week", () => {
    // Starts on a Wednesday, so Monday of that week never happened
    const expandable = item(
      { type: "weekly", interval: 1, days: ["mo", "we", "fr"] },
      "2026-10-07",
      [1, 2],
    );
    expect(
      expandOccurrences(
        expandable,
        [],
        "2026-10-07",
        "2026-10-12",
        "2026-10-07",
      ).map((o) => [o.date, o.turnGroupMemberId]),
    ).toEqual([
      ["2026-10-07", 1],
      ["2026-10-09", 2],
      ["2026-10-12", 1],
    ]);
  });

  it("schedules afterDone from the last completion and rolls overdue to today", () => {
    const chore = item({ type: "afterDone", interval: 7 }, "2026-10-01");
    expect(
      dates(chore, "2026-10-01", "2026-10-31", [done("2026-10-03")]),
    ).toEqual(["2026-10-03", "2026-10-16", "2026-10-23", "2026-10-30"]);
    expect(
      dates(chore, "2026-10-01", "2026-10-31", [done("2026-10-14")]),
    ).toEqual(["2026-10-14", "2026-10-21", "2026-10-28"]);
  });

  it("projects afterDone into a later month", () => {
    const chore = item({ type: "afterDone", interval: 10 }, "2026-10-16");
    expect(dates(chore, "2026-12-01", "2026-12-31")).toEqual([
      "2026-12-05",
      "2026-12-15",
      "2026-12-25",
    ]);
  });
});

describe("turnOn", () => {
  it("rotates afterDone by completions", () => {
    const chore = item(
      { type: "afterDone", interval: 7 },
      "2026-10-01",
      [1, 2],
    );
    const overrides = [done("2026-10-02"), done("2026-10-09")];
    expect(turnOn(chore, overrides, "2026-10-09")).toBe(2);
  });
});

describe("recurrenceSchema", () => {
  it("sorts and dedupes weekdays", () => {
    expect(
      recurrenceSchema.parse({
        type: "weekly",
        interval: 1,
        days: ["th", "mo", "th"],
      }),
    ).toEqual({ type: "weekly", interval: 1, days: ["mo", "th"] });
  });
});

describe("describeRecurrence", () => {
  const en = translatorFor("en");
  const de = translatorFor("de");

  it("reads naturally in English and German", () => {
    const tuesdays: Recurrence = { type: "weekly", interval: 1, days: ["tu"] };
    const everyOther: Recurrence = {
      type: "weekly",
      interval: 2,
      days: [weekdayOf("2026-10-16")],
    };
    expect(describeRecurrence(tuesdays, en, "en")).toBe("Every Tuesday");
    expect(describeRecurrence(tuesdays, de, "de")).toBe("Jeden Dienstag");
    expect(describeRecurrence(everyOther, en, "en")).toBe("Every other Friday");
    expect(describeRecurrence({ type: "daily", interval: 3 }, en, "en")).toBe(
      "Every 3 days",
    );
    expect(
      describeRecurrence({ type: "afterDone", interval: 1 }, en, "en"),
    ).toBe("1 day after it's last done");
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
    const range = {
      items: [
        {
          ...item(null, "2026-10-16", [2]),
          kind: "task" as const,
          title: "Bins",
          time: null,
        },
        {
          ...item(null, "2026-10-16"),
          id: 2,
          kind: "event" as const,
          title: "Plumber",
          time: "14:00",
        },
      ],
      occurrences: [],
    };
    const full = {
      ...range,
      occurrences: range.items.flatMap((i) =>
        expandOccurrences(i, [], "2026-10-16", "2026-10-16", "2026-10-16"),
      ),
    };
    expect(entriesOn(full, "2026-10-16").map((e) => e.item.title)).toEqual([
      "Plumber",
      "Bins",
    ]);
    expect(entriesOn(full, "2026-10-16", 1).map((e) => e.item.title)).toEqual([
      "Plumber",
    ]);
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
    { type: "afterDone", interval: 5 },
  ])("round-trips %j", (recurrence) => {
    expect(
      recurrenceOf(repeatFormOf(recurrence), "2026-10-16", "task"),
    ).toEqual(recurrence);
  });

  it("follows the start date until days are picked, and never lets events count from done", () => {
    const weekly = repeatFormOf({ type: "weekly", interval: 1, days: ["fr"] });
    expect(
      recurrenceOf({ ...weekly, days: null }, "2026-10-13", "task"),
    ).toEqual({ type: "weekly", interval: 1, days: ["tu"] });
    expect(
      recurrenceOf(
        repeatFormOf({ type: "afterDone", interval: 2 }),
        "2026-10-13",
        "event",
      ),
    ).toBeNull();
  });
});

describe("withSavedItem", () => {
  const window = { from: "2026-10-01", to: "2026-10-31", today: "2026-10-16" };
  const view = (recurrence: Recurrence, memberIds: number[] = []) => ({
    ...item(recurrence, "2026-10-05", memberIds),
    kind: "task" as const,
    title: "Vacuum",
    time: null,
  });

  it("keeps skipped occurrences hidden when only the title changes", () => {
    const weekly = view({ type: "weekly", interval: 1, days: ["mo"] });
    const cached = withRescheduled(
      withSavedItem({ items: [], occurrences: [] }, weekly, window),
      { itemId: 1, originalDate: "2026-10-12", movedTo: null, skipped: true },
      window,
    );
    const renamed = withSavedItem(
      cached,
      { ...weekly, title: "Hoover" },
      window,
    );
    expect(renamed.occurrences.map((o) => o.date)).not.toContain("2026-10-12");
    expect(renamed.items[0]?.title).toBe("Hoover");
  });

  it("keeps afterDone dates whose last completion is outside the cache", () => {
    const chore = view({ type: "afterDone", interval: 7 });
    const cached = {
      items: [chore],
      occurrences: expandOccurrences(
        chore,
        [done("2026-09-28")],
        "2026-10-26",
        "2026-11-30",
        "2026-10-16",
      ),
    };
    const renamed = withSavedItem(
      cached,
      { ...chore, title: "Hoover" },
      window,
    );
    expect(renamed.occurrences).toEqual(cached.occurrences);
  });

  it("brings an un-skipped occurrence back and moves into a cached month", () => {
    const weekly = view({ type: "weekly", interval: 1, days: ["mo"] }, [1, 2]);
    const skipped = withRescheduled(
      withSavedItem({ items: [], occurrences: [] }, weekly, window),
      { itemId: 1, originalDate: "2026-10-12", movedTo: null, skipped: true },
      window,
    );
    const restored = withRescheduled(
      skipped,
      { itemId: 1, originalDate: "2026-10-12", movedTo: null, skipped: false },
      window,
    );
    expect(
      restored.occurrences.map((o) => [o.date, o.turnGroupMemberId]),
    ).toEqual([
      ["2026-10-05", 1],
      ["2026-10-12", 2],
      ["2026-10-19", 1],
      ["2026-10-26", 2],
    ]);
    const movedAway = withRescheduled(
      restored,
      {
        itemId: 1,
        originalDate: "2026-10-26",
        movedTo: "2026-11-02",
        skipped: false,
      },
      window,
    );
    expect(movedAway.occurrences.map((o) => o.date)).not.toContain(
      "2026-10-26",
    );
  });

  it("drops moves of the old rule when the schedule changes, like the server", () => {
    const weekly = view({ type: "weekly", interval: 1, days: ["mo"] });
    const moved = withRescheduled(
      withSavedItem({ items: [], occurrences: [] }, weekly, window),
      {
        itemId: 1,
        originalDate: "2026-10-12",
        movedTo: "2026-10-14",
        skipped: false,
      },
      window,
    );
    const once = withSavedItem(moved, { ...weekly, recurrence: null }, window);
    expect(once.occurrences.map((o) => o.date)).toEqual(["2026-10-05"]);
  });

  it("re-deals turns when the rotation changes", () => {
    const weekly = view({ type: "weekly", interval: 1, days: ["mo"] }, [1, 2]);
    const cached = withSavedItem(
      { items: [], occurrences: [] },
      weekly,
      window,
    );
    const swapped = withSavedItem(
      cached,
      { ...weekly, memberIds: [2, 1] },
      window,
    );
    expect(swapped.occurrences.map((o) => o.turnGroupMemberId)).toEqual([
      2, 1, 2, 1,
    ]);
  });
});

describe("isScheduledOn", () => {
  it("rejects dates the rule no longer produces", () => {
    const tuesdays = item({ type: "weekly", interval: 1, days: ["tu"] });
    expect(isScheduledOn(tuesdays, "2026-10-13")).toBe(true);
    expect(isScheduledOn(tuesdays, "2026-10-12")).toBe(false);
  });

  it("caps weekly intervals at a year", () => {
    expect(
      recurrenceSchema.safeParse({ type: "weekly", interval: 53, days: ["mo"] })
        .success,
    ).toBe(false);
  });
});

describe("afterDone ticking", () => {
  const window = { from: "2026-10-01", to: "2026-10-31", today: "2026-10-16" };
  const chore = {
    ...item({ type: "afterDone", interval: 3 }, "2026-10-01", [1, 2]),
    kind: "task" as const,
    title: "Vacuum",
    time: null,
  };

  it("shows only the next due occurrence as tickable", () => {
    const expanded = expandOccurrences(
      chore,
      [done("2026-10-14")],
      "2026-10-16",
      "2026-10-22",
      "2026-10-16",
    );
    expect(expanded.map((o) => [o.date, o.projected])).toEqual([
      ["2026-10-17", false],
      ["2026-10-20", true],
    ]);
  });

  it("blocks a second tick once it was done today or later, even after an undo elsewhere", () => {
    expect(
      canComplete(chore, [done("2026-10-14")], "2026-10-17", "2026-10-16"),
    ).toBe(true);
    expect(
      canComplete(chore, [done("2026-10-16")], "2026-10-19", "2026-10-16"),
    ).toBe(false);
    expect(
      canComplete(chore, [done("2026-10-17")], "2026-10-20", "2026-10-16"),
    ).toBe(false);
  });

  it("counts forecasts from a later start date after an optimistic tick", () => {
    const later = { ...chore, startsOn: "2026-10-30" };
    const range = {
      items: [later],
      occurrences: expandOccurrences(
        later,
        [],
        "2026-10-01",
        "2026-10-31",
        "2026-10-16",
      ),
    };
    const ticked = withDone(
      range,
      { itemId: 1, originalDate: "2026-10-30", done: true, byGroupMemberId: 1 },
      window,
    );
    const server = expandOccurrences(
      later,
      [done("2026-10-16", 1)],
      "2026-10-01",
      "2026-10-31",
      "2026-10-16",
    );
    expect(ticked.occurrences.map((o) => [o.date, o.projected])).toEqual(
      server.map((o) => [o.date, o.projected]),
    );
  });

  it("waits for a later start date even after it was done", () => {
    expect(
      dates({ ...chore, startsOn: "2026-10-25" }, "2026-10-01", "2026-10-31", [
        done("2026-10-14"),
      ]),
    ).toEqual(["2026-10-14", "2026-10-25", "2026-10-28", "2026-10-31"]);
  });

  it("moves the tick to today and counts the next ones from there, like the server", () => {
    const overrides = [done("2026-10-14")];
    const range = {
      items: [chore],
      occurrences: expandOccurrences(
        chore,
        overrides,
        "2026-10-01",
        "2026-10-31",
        "2026-10-16",
      ),
    };
    const ticked = withDone(
      range,
      { itemId: 1, originalDate: "2026-10-17", done: true, byGroupMemberId: 2 },
      window,
    );
    const server = expandOccurrences(
      chore,
      [...overrides, done("2026-10-16", 2)],
      "2026-10-01",
      "2026-10-31",
      "2026-10-16",
    );
    const shape = (o: {
      date: string;
      turnGroupMemberId: number | null;
      completedByGroupMemberId: number | null;
      projected: boolean;
    }) => [
      o.date,
      o.turnGroupMemberId,
      o.completedByGroupMemberId,
      o.projected,
    ];
    expect(ticked.occurrences.map(shape)).toEqual(server.map(shape));
  });
});
