import type { FaqItem } from "./content";
import type { MarketingTranslator } from "./i18n";
import { FAQ, faqItems, PLANS } from "./content";

const SCREENSHOT_BASE =
  "https://raw.githubusercontent.com/RaphaelMitas/flatsby/assets";

export interface Screenshot {
  src: string;
  alt: string;
  width: number;
  height: number;
}

const SHOTS = {
  webHome: { file: "web/web-home.png", portrait: false },
  webLists: { file: "web/web-shopping-list.png", portrait: false },
  webExpenses: { file: "web/web-expenses.png", portrait: false },
  webChat: { file: "web/web-chat.png", portrait: false },
  iosList: { file: "ios/02-shopping-list.png", portrait: true },
  iosSplit: { file: "ios/04-expense-split.png", portrait: true },
  iosCalendar: { file: "ios/01a-calendar.png", portrait: true },
  webCalendar: { file: "web/web-calendar.png", portrait: false },
};

export function screenshot(
  t: MarketingTranslator,
  id: keyof typeof SHOTS,
): Screenshot {
  const { file, portrait } = SHOTS[id];
  return {
    src: `${SCREENSHOT_BASE}/${file}`,
    alt: t(`screenshots.${id}`),
    width: portrait ? 1320 : 2880,
    height: portrait ? 2868 : 1800,
  };
}

export interface PageSection {
  heading: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
  image?: Screenshot;
}

export interface ContentPageData {
  slug: string;
  title: string;
  description: string;
  headline: string;
  intro: string;
  sections: readonly PageSection[];
  table?: {
    caption: string;
    head: readonly string[];
    rows: readonly (readonly string[])[];
  };
  faq?: readonly FaqItem[];
}

export const CONTENT_SLUGS = [
  "features/calendar",
  "features/shopping-lists",
  "features/expenses",
  "features/ai-assistant",
  "splitwise-alternative",
  "flatastic-alternative",
  "pricing",
  "faq",
] as const;

export function contentPages(t: MarketingTranslator): ContentPageData[] {
  const yes = t("table.yes");
  const no = t("table.no");
  const none = t("table.none");
  const pro = t("table.pro");
  const noLimit = t("table.noLimit");
  const platforms = t("table.platforms");

  return [
    {
      slug: "features/calendar",
      title: t("pages.calendar.title"),
      description: t("pages.calendar.description"),
      headline: t("pages.calendar.headline"),
      intro: t("pages.calendar.intro"),
      sections: [
        {
          heading: t("pages.calendar.setup.heading"),
          bullets: [
            t("pages.calendar.setup.invite"),
            t("pages.calendar.setup.tasks"),
            t("pages.calendar.setup.rotation"),
          ],
          image: screenshot(t, "iosCalendar"),
        },
        {
          heading: t("pages.calendar.mine.heading"),
          paragraphs: [t("pages.calendar.mine.body")],
        },
        {
          heading: t("pages.calendar.fair.heading"),
          paragraphs: [t("pages.calendar.fair.body")],
        },
        {
          heading: t("pages.calendar.template.heading"),
          paragraphs: [t("pages.calendar.template.body")],
        },
        {
          heading: t("pages.calendar.events.heading"),
          paragraphs: [t("pages.calendar.events.body")],
          image: screenshot(t, "webCalendar"),
        },
        {
          heading: t("pages.calendar.couples.heading"),
          paragraphs: [t("pages.calendar.couples.body")],
        },
        {
          heading: t("pages.calendar.limits.heading"),
          bullets: [
            t("pages.calendar.limits.reminders"),
            t("pages.calendar.limits.points"),
            t("pages.calendar.limits.swap"),
            t("pages.calendar.limits.live"),
          ],
          paragraphs: [t("pages.calendar.limits.alternatives")],
        },
      ],
      faq: faqItems(t, ["chores", "free", "members"]),
    },
    {
      slug: "features/shopping-lists",
      title: t("pages.shoppingLists.title"),
      description: t("pages.shoppingLists.description"),
      headline: t("pages.shoppingLists.headline"),
      intro: t("pages.shoppingLists.intro"),
      sections: [
        {
          heading: t("pages.shoppingLists.howItWorks.heading"),
          paragraphs: [
            t("pages.shoppingLists.howItWorks.lists"),
            t("pages.shoppingLists.howItWorks.categories"),
          ],
          image: screenshot(t, "iosList"),
        },
        {
          heading: t("pages.shoppingLists.devices.heading"),
          paragraphs: [t("pages.shoppingLists.devices.body")],
          image: screenshot(t, "webLists"),
        },
        {
          heading: t("pages.shoppingLists.limits.heading"),
          paragraphs: [t("pages.shoppingLists.limits.body")],
        },
      ],
      faq: faqItems(t, ["realtime", "android", "members"]),
    },
    {
      slug: "features/expenses",
      title: t("pages.expenses.title"),
      description: t("pages.expenses.description"),
      headline: t("pages.expenses.headline"),
      intro: t("pages.expenses.intro"),
      sections: [
        {
          heading: t("pages.expenses.splits.heading"),
          bullets: [
            t("pages.expenses.splits.equal"),
            t("pages.expenses.splits.percentage"),
            t("pages.expenses.splits.shares"),
            t("pages.expenses.splits.exact"),
          ],
          paragraphs: [t("pages.expenses.splits.body")],
          image: screenshot(t, "iosSplit"),
        },
        {
          heading: t("pages.expenses.balances.heading"),
          paragraphs: [
            t("pages.expenses.balances.owes"),
            t("pages.expenses.balances.settlement"),
          ],
          image: screenshot(t, "webExpenses"),
        },
        {
          heading: t("pages.expenses.currencies.heading"),
          paragraphs: [
            t("pages.expenses.currencies.currencies"),
            t("pages.expenses.currencies.categories"),
          ],
        },
        {
          heading: t("pages.expenses.recurring.heading"),
          paragraphs: [t("pages.expenses.recurring.body")],
        },
      ],
      faq: faqItems(t, ["split", "rent", "splitwise"]),
    },
    {
      slug: "features/ai-assistant",
      title: t("pages.aiAssistant.title"),
      description: t("pages.aiAssistant.description"),
      headline: t("pages.aiAssistant.headline"),
      intro: t("pages.aiAssistant.intro"),
      sections: [
        {
          heading: t("pages.aiAssistant.questions.heading"),
          bullets: [
            t("pages.aiAssistant.questions.groceries"),
            t("pages.aiAssistant.questions.paidMost"),
            t("pages.aiAssistant.questions.addItems"),
            t("pages.aiAssistant.questions.logExpense"),
          ],
          image: screenshot(t, "webChat"),
        },
        {
          heading: t("pages.aiAssistant.data.heading"),
          paragraphs: [
            t("pages.aiAssistant.data.consent"),
            t("pages.aiAssistant.data.categories"),
            t("pages.aiAssistant.data.training"),
          ],
        },
        {
          heading: t("pages.aiAssistant.credits.heading"),
          paragraphs: [t("pages.aiAssistant.credits.body", PLANS)],
        },
      ],
      faq: faqItems(t, ["assistant", "free"]),
    },
    {
      slug: "splitwise-alternative",
      title: t("pages.splitwise.title"),
      description: t("pages.splitwise.description"),
      headline: t("pages.splitwise.headline"),
      intro: t("pages.splitwise.intro"),
      table: {
        caption: t("pages.splitwise.table.caption"),
        head: ["", "Flatsby", "Splitwise"],
        rows: [
          [
            t("pages.splitwise.table.lists"),
            t("pages.splitwise.table.listsFlatsby"),
            no,
          ],
          [
            t("pages.splitwise.table.limit"),
            none,
            t("pages.splitwise.table.limitSplitwise"),
          ],
          [
            t("pages.splitwise.table.ads"),
            none,
            t("pages.splitwise.table.adsSplitwise"),
          ],
          [t("pages.splitwise.table.split"), yes, yes],
          [t("pages.splitwise.table.simplify"), yes, yes],
          [
            t("pages.splitwise.table.currency"),
            t("pages.splitwise.table.currencyFlatsby"),
            pro,
          ],
          [
            t("pages.splitwise.table.receipts"),
            t("pages.splitwise.table.receiptsFlatsby"),
            pro,
          ],
          [
            t("pages.splitwise.table.charts"),
            t("pages.splitwise.table.chartsFlatsby"),
            pro,
          ],
          [t("pages.splitwise.table.outside"), no, yes],
          [t("pages.splitwise.table.platforms"), platforms, platforms],
          [
            t("pages.splitwise.table.openSource"),
            t("pages.splitwise.table.openSourceFlatsby"),
            no,
          ],
        ],
      },
      sections: [
        {
          heading: t("pages.splitwise.better.heading"),
          paragraphs: [t("pages.splitwise.better.body")],
        },
        {
          heading: t("pages.splitwise.moving.heading"),
          bullets: [
            t("pages.splitwise.moving.export"),
            t("pages.splitwise.moving.group"),
            t("pages.splitwise.moving.upload"),
            t("pages.splitwise.moving.match"),
            t("pages.splitwise.moving.preview"),
            t("pages.splitwise.moving.import"),
          ],
        },
      ],
      faq: faqItems(t, ["splitwise", "free", "android"]),
    },
    {
      slug: "flatastic-alternative",
      title: t("pages.flatastic.title"),
      description: t("pages.flatastic.description"),
      headline: t("pages.flatastic.headline"),
      intro: t("pages.flatastic.intro"),
      table: {
        caption: t("pages.flatastic.table.caption"),
        head: ["", "Flatsby", "Flatastic"],
        rows: [
          [
            t("pages.flatastic.table.chores"),
            yes,
            t("pages.flatastic.table.choresFlatastic"),
          ],
          [t("pages.flatastic.table.reminders"), no, yes],
          [t("pages.flatastic.table.calendar"), yes, no],
          [t("pages.flatastic.table.pinboard"), no, yes],
          [
            t("pages.flatastic.table.lists"),
            t("pages.flatastic.table.listsFlatsby"),
            t("pages.flatastic.table.listsFlatastic"),
          ],
          [t("pages.flatastic.table.expenses"), yes, yes],
          [
            t("pages.flatastic.table.ads"),
            none,
            t("pages.flatastic.table.adsFlatastic"),
          ],
          [
            t("pages.flatastic.table.history"),
            t("pages.flatastic.table.free"),
            t("pages.flatastic.table.withPremium"),
          ],
          [
            t("pages.flatastic.table.export"),
            t("pages.flatastic.table.free"),
            t("pages.flatastic.table.exportFlatastic"),
          ],
          [t("pages.flatastic.table.households"), yes, no],
          [
            t("pages.flatastic.table.signIn"),
            t("pages.flatastic.table.signInFlatsby"),
            t("pages.flatastic.table.signInFlatastic"),
          ],
          [t("pages.flatastic.table.platforms"), platforms, platforms],
        ],
      },
      sections: [
        {
          heading: t("pages.flatastic.free.heading"),
          paragraphs: [t("pages.flatastic.free.body")],
        },
        {
          heading: t("pages.flatastic.rent.heading"),
          paragraphs: [t("pages.flatastic.rent.body")],
        },
        {
          heading: t("pages.flatastic.better.heading"),
          paragraphs: [t("pages.flatastic.better.body")],
        },
        {
          heading: t("pages.flatastic.data.heading"),
          paragraphs: [t("pages.flatastic.data.body")],
        },
        {
          heading: t("pages.flatastic.moving.heading"),
          bullets: [
            t("pages.flatastic.moving.household"),
            t("pages.flatastic.moving.chores"),
            t("pages.flatastic.moving.balances"),
          ],
        },
      ],
      faq: faqItems(t, ["flatastic", "free", "splitwise"]),
    },
    {
      slug: "pricing",
      title: t("pages.pricing.title"),
      description: t("pages.pricing.description", PLANS),
      headline: t("pages.pricing.headline"),
      intro: t("pages.pricing.intro"),
      table: {
        caption: t("pages.pricing.table.caption"),
        head: ["", t("plans.free"), t("plans.starter"), t("plans.pro")],
        rows: [
          [t("pages.pricing.table.core"), yes, yes, yes],
          [t("pages.pricing.table.members"), noLimit, noLimit, noLimit],
          [t("pages.pricing.table.ads"), none, none, none],
          [
            t("pages.pricing.table.credits"),
            t("plans.credits", { credits: PLANS.freeCredits }),
            t("plans.credits", { credits: PLANS.starterCredits }),
            t("plans.credits", { credits: PLANS.proCredits }),
          ],
          [
            t("pages.pricing.table.price"),
            t("plans.free"),
            t("plans.perMonth", { price: PLANS.starterPrice }),
            t("plans.perMonth", { price: PLANS.proPrice }),
          ],
        ],
      },
      sections: [
        {
          heading: t("pages.pricing.credits.heading"),
          paragraphs: [t("pages.pricing.credits.body")],
        },
        {
          heading: t("pages.pricing.buy.heading"),
          paragraphs: [t("pages.pricing.buy.body", PLANS)],
        },
      ],
      faq: faqItems(t, ["free", "assistant"]),
    },
    {
      slug: "faq",
      title: t("pages.faq.title"),
      description: t("pages.faq.description"),
      headline: t("pages.faq.headline"),
      intro: t("pages.faq.intro"),
      sections: [],
      faq: faqItems(t, FAQ),
    },
  ] satisfies (ContentPageData & { slug: (typeof CONTENT_SLUGS)[number] })[];
}

export function contentPageParams() {
  return CONTENT_SLUGS.map((slug) => ({ slug: slug.split("/") }));
}

export function findContentPage(
  t: MarketingTranslator,
  slug: readonly string[],
): ContentPageData | undefined {
  return contentPages(t).find((page) => page.slug === slug.join("/"));
}
