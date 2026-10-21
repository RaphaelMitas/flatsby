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
  homeAgenda,
  monthDayChoices,
  monthGrid,
  recurrenceOf,
  recurrenceSchema,
  repeatFormOf,
  shiftMonth,
  splitOff,
  splitsSeries,
  startsAfterEnd,
  withPickedStart,
  withSavedItem,
  withSkipped,
  withSplitSeries,
  withStart,
} from "./calendar";

const item = (
  recurrence: Recurrence | null,
  startsOn = "2026-10-06",
  memberIds: number[] = [],
): CalendarItemView => ({
  id: 1,
  kind: "task",
  title: "Bins",
  color: "gray",
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

describe("monthly and yearly", () => {
  const between = (expandable: CalendarItemView, from: string, to: string) =>
    expandOccurrences(expandable, [], from, to).map((o) => [
      o.date,
      o.turnGroupMemberId,
    ]);

  it("puts day 31 on the last day of shorter months", () => {
    const monthEnd = item(
      { type: "monthly", interval: 1, on: { day: 31 } },
      "2026-01-31",
    );
    expect(
      expandOccurrences(monthEnd, [], "2026-01-01", "2026-05-31").map(
        (o) => o.date,
      ),
    ).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  it("skips months by interval and doesn't count a first date before the start", () => {
    const thirdThursday = item(
      { type: "monthly", interval: 2, on: { week: "third", weekday: "th" } },
      "2026-10-20",
      [1, 2],
    );
    expect(between(thirdThursday, "2026-10-01", "2027-02-28")).toEqual([
      ["2026-12-17", 1],
      ["2027-02-18", 2],
    ]);
  });

  it("finds the last weekday of each month", () => {
    const lastFriday = item(
      { type: "monthly", interval: 1, on: { week: "last", weekday: "fr" } },
      "2026-10-01",
    );
    expect(
      expandOccurrences(lastFriday, [], "2026-10-01", "2026-12-31").map(
        (o) => o.date,
      ),
    ).toEqual(["2026-10-30", "2026-11-27", "2026-12-25"]);
  });

  it("moves Feb 29 to Feb 28 outside leap years", () => {
    const leapDay = item(
      { type: "yearly", interval: 1, on: { month: 2, day: 29 } },
      "2024-02-29",
    );
    expect(
      expandOccurrences(leapDay, [], "2024-01-01", "2028-12-31").map(
        (o) => o.date,
      ),
    ).toEqual([
      "2024-02-29",
      "2025-02-28",
      "2026-02-28",
      "2027-02-28",
      "2028-02-29",
    ]);
  });

  it("starts a yearly rule in the first year its date comes after the start", () => {
    const rule: Recurrence = {
      type: "yearly",
      interval: 2,
      on: { month: 10, day: 16 },
    };
    expect(
      between(item(rule, "2026-10-20", [1, 2]), "2026-01-01", "2030-12-31"),
    ).toEqual([
      ["2028-10-16", 1],
      ["2030-10-16", 2],
    ]);
    expect(
      between(item(rule, "2026-03-01"), "2026-01-01", "2026-12-31"),
    ).toEqual([["2026-10-16", null]]);
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

  it("describes monthly and yearly rules", () => {
    const cases: [Recurrence, string, string][] = [
      [
        { type: "monthly", interval: 1, on: { day: 16 } },
        "Every month on day 16",
        "Jeden Monat am 16.",
      ],
      [
        { type: "monthly", interval: 3, on: { week: "third", weekday: "th" } },
        "Every 3 months on the third Thursday",
        "Alle 3 Monate am dritten Donnerstag",
      ],
      [
        { type: "monthly", interval: 1, on: { day: 31 } },
        "Every month on the last day",
        "Jeden Monat am letzten Tag",
      ],
      [
        { type: "yearly", interval: 1, on: { month: 10, day: 16 } },
        "Every year on October 16",
        "Jedes Jahr am 16. Oktober",
      ],
    ];
    for (const [recurrence, en, de] of cases) {
      expect(describeRecurrence(recurrence, translatorFor("en"), "en")).toBe(
        en,
      );
      expect(describeRecurrence(recurrence, translatorFor("de"), "de")).toBe(
        de,
      );
    }
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
    { type: "monthly", interval: 1, on: { day: 3 } },
    { type: "monthly", interval: 6, on: { week: "last", weekday: "mo" } },
    { type: "yearly", interval: 1, on: { month: 2, day: 29 } },
  ])("round-trips %j", (recurrence) => {
    expect(recurrenceOf(repeatFormOf(recurrence), "2026-10-16")).toEqual(
      recurrence,
    );
  });

  it("offers the start date's day and weekday, with 'last' in the month's final week", () => {
    const monthly = repeatFormOf({
      type: "monthly",
      interval: 1,
      on: { day: 16 },
    });
    expect(monthDayChoices(monthly, "2026-10-16")).toEqual([
      { on: { day: 16 }, selected: true },
      { on: { week: "third", weekday: "fr" }, selected: false },
    ]);
    expect(monthDayChoices(monthly, "2026-10-29")[1]).toEqual({
      on: { week: "last", weekday: "th" },
      selected: false,
    });
  });

  it("moves a picked monthly day when the start date is picked", () => {
    const byWeekday = repeatFormOf({
      type: "monthly",
      interval: 1,
      on: { week: "third", weekday: "fr" },
    });
    expect(
      recurrenceOf(withPickedStart(byWeekday, "2026-10-29"), "2026-10-29"),
    ).toEqual({
      type: "monthly",
      interval: 1,
      on: { week: "last", weekday: "th" },
    });
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
      time: { start: "14:00", end: "15:00" },
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

describe("withStart", () => {
  it("keeps the length when the start moves, wrapping past midnight", () => {
    expect(withStart({ start: "19:00", end: "20:30" }, "23:00")).toEqual({
      start: "23:00",
      end: "00:30",
    });
    expect(withStart({ start: "22:00", end: "02:00" }, "01:00")).toEqual({
      start: "01:00",
      end: "05:00",
    });
  });
});

describe("splitsSeries", () => {
  const weekly = item({ type: "weekly", interval: 1, days: ["mo"] });
  const tuesdays = {
    startsOn: "2026-10-20",
    recurrence: { type: "weekly", interval: 1, days: ["tu"] },
  } satisfies Parameters<typeof splitsSeries>[1];
  const today = "2026-10-16";

  it("splits a running series when its rule changes from a later date", () => {
    expect(splitsSeries(weekly, tuesdays, today)).toBe(true);
  });

  it("edits in place when only other fields change, the start moves back, or it never repeated", () => {
    expect(splitsSeries(weekly, weekly, today)).toBe(false);
    expect(
      splitsSeries(weekly, { startsOn: "2026-10-01", recurrence: null }, today),
    ).toBe(false);
    expect(
      splitsSeries(
        item(null),
        { startsOn: "2026-10-20", recurrence: null },
        today,
      ),
    ).toBe(false);
  });

  it("splits a piece whose newer rule only takes over later", () => {
    expect(
      splitsSeries({ ...weekly, endsOn: "2026-11-01" }, tuesdays, today),
    ).toBe(true);
  });

  it("edits in place before the series started or once a newer rule took over", () => {
    expect(splitsSeries(weekly, tuesdays, "2026-10-06")).toBe(false);
    expect(
      splitsSeries({ ...weekly, endsOn: "2026-10-12" }, tuesdays, today),
    ).toBe(false);
  });
});

describe("startsAfterEnd", () => {
  it("refuses to start an ended piece after its end", () => {
    const ended = {
      ...item({ type: "weekly", interval: 1, days: ["mo"] }),
      endsOn: "2026-10-15",
    };
    expect(startsAfterEnd(ended, { ...ended, startsOn: "2026-10-16" })).toBe(
      true,
    );
    expect(startsAfterEnd(ended, ended)).toBe(false);
  });
});

describe("splitOff", () => {
  // Tuesdays from 10-06 for 1, 2, 3: 10-20 is the third, so 3 is up
  const weekly = item(
    { type: "weekly", interval: 1, days: ["tu"] },
    undefined,
    [1, 2, 3],
  );
  const next = {
    startsOn: "2026-10-19",
    recurrence: weekly.recurrence,
    memberIds: [1, 2, 3],
  };

  it("hands the rotation on to whoever was next under the old rule", () => {
    expect(splitOff(weekly, next).memberIds).toEqual([3, 1, 2]);
    expect(splitOff(weekly, { ...next, memberIds: [1, 2] }).memberIds).toEqual([
      1, 2,
    ]);
  });

  it("finds the next turn even when the old piece ends before it", () => {
    expect(
      splitOff({ ...weekly, endsOn: "2026-10-19" }, next).memberIds,
    ).toEqual([3, 1, 2]);
  });

  it("keeps a later change's start, unless the new piece is a one-off", () => {
    const ending = { ...weekly, endsOn: "2026-11-01" };
    expect(splitOff(ending, next).endsOn).toBe("2026-11-01");
    expect(splitOff(ending, { ...next, recurrence: null }).endsOn).toBeNull();
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

  it("keeps ticks and skips on days an edited schedule still has", () => {
    const range = withSkipped(
      {
        items: [weekly],
        occurrences: expandOccurrences(
          weekly,
          [done("2026-10-06")],
          window.from,
          window.to,
        ),
      },
      { itemId: 1, date: "2026-10-13", skipped: true },
      window,
    );
    const edited = withSavedItem(
      range,
      {
        ...weekly,
        recurrence: { type: "weekly", interval: 1, days: ["tu", "fr"] },
      },
      window,
    );
    expect(edited.occurrences.map((o) => [o.date, !!o.completedAt])).toEqual([
      ["2026-10-06", true],
      ["2026-10-09", false],
      ["2026-10-16", false],
      ["2026-10-20", false],
      ["2026-10-23", false],
      ["2026-10-27", false],
      ["2026-10-30", false],
    ]);
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

  it("ends the old series the day before the new rule starts and moves its later ticks over", () => {
    const next = {
      ...weekly,
      id: -1,
      startsOn: "2026-10-20",
      recurrence: { type: "weekly", interval: 1, days: ["tu", "we"] },
    } satisfies CalendarItemView;
    const ticked = {
      items: [weekly],
      occurrences: expandOccurrences(
        weekly,
        [done("2026-10-13"), done("2026-10-20")],
        window.from,
        window.to,
      ),
    };
    const split = withSplitSeries(ticked, 1, next, window);
    expect(split.items.find((i) => i.id === 1)?.endsOn).toBe("2026-10-19");
    expect(
      split.occurrences.map((o) => `${o.itemId}:${o.date}:${!!o.completedAt}`),
    ).toEqual([
      "1:2026-10-06:false",
      "1:2026-10-13:true",
      "-1:2026-10-20:true",
      "-1:2026-10-21:false",
      "-1:2026-10-27:false",
      "-1:2026-10-28:false",
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

  it("keeps a monthly day when a change splits the series today", () => {
    const monthly = item({ type: "monthly", interval: 1, on: { day: 6 } });
    const everyOther = { ...repeatFormOf(monthly.recurrence), every: 2 };
    const startsOn = editedStartsOn(monthly, everyOther, null, today);
    expect(startsOn).toBe(today);
    expect(recurrenceOf(everyOther, startsOn)).toEqual({
      type: "monthly",
      interval: 2,
      on: { day: 6 },
    });
  });
});

describe("homeAgenda", () => {
  const ME = 1;
  const task = (
    id: number,
    title: string,
    startsOn: string,
    memberIds: number[],
    recurrence: Recurrence | null = null,
  ): CalendarItemView => ({
    ...item(recurrence, startsOn, memberIds),
    id,
    title,
  });
  const event = (
    id: number,
    title: string,
    startsOn: string,
  ): CalendarItemView => ({
    ...task(id, title, startsOn, []),
    kind: "event",
    time: { start: "19:00", end: "20:00" },
  });
  const kitchen = task(1, "Kitchen", "2026-10-05", [ME], {
    type: "weekly",
    interval: 1,
    days: ["mo"],
  });
  const items = [
    kitchen,
    task(2, "Bathroom", "2026-10-21", [ME]),
    task(3, "Bins", "2026-10-21", [2]),
    event(4, "Yesterday's party", "2026-10-20"),
    event(5, "Lea's birthday", "2026-10-24"),
    event(6, "Flat dinner", "2026-10-23"),
    {
      ...event(7, "Breakfast", "2026-10-21"),
      time: { start: "08:00", end: "09:00" },
    },
  ];
  const range: CalendarRange = {
    items,
    occurrences: items.flatMap((i) =>
      expandOccurrences(
        i,
        i === kitchen ? [done("2026-10-05")] : [],
        window.from,
        window.to,
      ),
    ),
  };
  const agenda = homeAgenda(range, "2026-10-21", "12:00", ME);

  it("lists my open chores up to today, a chore left for weeks once with its missed days", () => {
    expect(
      agenda.due.map(({ item, occurrence, missed }) => [
        item.title,
        occurrence.date,
        missed,
      ]),
    ).toEqual([
      ["Kitchen", "2026-10-19", ["2026-10-12"]],
      ["Bathroom", "2026-10-21", []],
    ]);
  });

  it("finds my next turn after today and the next event that hasn't ended", () => {
    expect(agenda.nextTurn?.occurrence.date).toBe("2026-10-26");
    expect(agenda.nextEvent?.item.title).toBe("Flat dinner");
  });

  it("keeps an event that runs past midnight until it ends", () => {
    const party = {
      ...event(8, "Party", "2026-10-21"),
      time: { start: "21:00", end: "01:00" },
    };
    const withParty: CalendarRange = {
      items: [party],
      occurrences: expandOccurrences(party, [], window.from, window.to),
    };
    const next = (today: string, now: string) =>
      homeAgenda(withParty, today, now, ME).nextEvent?.item.title;
    expect(next("2026-10-21", "22:00")).toBe("Party");
    expect(next("2026-10-22", "00:30")).toBe("Party");
    expect(next("2026-10-22", "02:00")).toBeUndefined();
  });
});
