import type { FaqItem } from "./content";
import { FAQ, pickFaq, PLANS } from "./content";

const SCREENSHOT_BASE =
  "https://raw.githubusercontent.com/RaphaelMitas/flatsby/assets";

export interface Screenshot {
  src: string;
  alt: string;
  width: number;
  height: number;
}

const web = (file: string, alt: string): Screenshot => ({
  src: `${SCREENSHOT_BASE}/web/${file}`,
  alt,
  width: 2880,
  height: 1800,
});

const ios = (file: string, alt: string): Screenshot => ({
  src: `${SCREENSHOT_BASE}/ios/${file}`,
  alt,
  width: 1320,
  height: 2868,
});

export const SCREENSHOTS = {
  webHome: web("web-home.png", "Flatsby home screen on the web"),
  webLists: web(
    "web-shopping-list.png",
    "A shared grocery list in the Flatsby web app",
  ),
  webExpenses: web(
    "web-expenses.png",
    "List of shared expenses with who paid and how it was split",
  ),
  webChat: web(
    "web-chat.png",
    "The AI assistant answering a spending question with a chart",
  ),
  iosList: ios("02-shopping-list.png", "A shared shopping list on iPhone"),
  iosExpenses: ios("03-expenses.png", "Shared expenses on iPhone"),
  iosSplit: ios(
    "04-expense-split.png",
    "Splitting an expense between flatmates on iPhone",
  ),
};

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

export const CONTENT_PAGES = [
  {
    slug: "features/shopping-lists",
    title: "Shared shopping list app for flatmates | Flatsby",
    description:
      "One shopping list for the whole flat on web, iPhone and Android, sorted by category, with who added each item. Free.",
    headline: "A shared shopping list the whole flat can use",
    intro:
      "Everyone in your household adds to the same lists from their own phone or browser. Whoever is in the shop ticks things off, and the item is gone for everyone else too.",
    sections: [
      {
        heading: "How it works",
        paragraphs: [
          "Create as many lists as your household needs, for example one for groceries and one for the hardware store. Anyone in the group can add, edit or tick off items.",
          "Each item has a category such as produce, dairy or bakery, so the list sorts itself the way a shop is laid out. When you add an item, Flatsby can suggest the category by sending the item name to a classification model, and you can change it. This uses AI credits.",
        ],
        image: SCREENSHOTS.iosList,
      },
      {
        heading: "The same list on every device",
        paragraphs: [
          "The same lists open on the web, on iPhone and on Android. Changes are not pushed live yet: a flatmate's edits show up when you open the list again or come back to the app or tab.",
        ],
        image: SCREENSHOTS.webLists,
      },
      {
        heading: "What it does not do",
        paragraphs: [
          "There are no reminders or push notifications yet. Lists are for shopping, not for chores or to-dos.",
        ],
      },
    ],
    faq: pickFaq(
      "Do shopping lists update in real time?",
      "Does Flatsby work on Android?",
      "How many people can be in a household?",
    ),
  },
  {
    slug: "features/expenses",
    title: "Split bills and expenses with flatmates | Flatsby",
    description:
      "Log shared costs, split them equally, by percentage or exact amounts, and see who owes whom. Settle up with fewer payments. Free.",
    headline: "Split bills with your flatmates without a spreadsheet",
    intro:
      "Log what you paid, choose how to split it, and Flatsby keeps a running balance for everyone in the household.",
    sections: [
      {
        heading: "Three ways to split",
        bullets: [
          "Equally between everyone, or between the people you pick.",
          "By percentage, for example rent split 60/40 by room size.",
          "By exact amounts, when each person owes a specific sum.",
        ],
        paragraphs: [
          "Each expense keeps its own split, so a 60/40 rent payment and a 50/50 grocery run can sit side by side in the same balance.",
        ],
        image: SCREENSHOTS.iosSplit,
      },
      {
        heading: "Balances and settling up",
        paragraphs: [
          "Flatsby shows what each person owes or is owed. It simplifies the debts, so the household needs fewer payments to get back to zero.",
          "When someone pays a flatmate back, record it as a settlement and both balances update.",
        ],
        image: SCREENSHOTS.webExpenses,
      },
      {
        heading: "Currencies and categories",
        paragraphs: [
          "Expenses can be in EUR, USD or GBP. Flatsby does not convert between currencies. It keeps a separate balance per currency instead.",
          "Every expense has a category, such as groceries, internet or home goods, so you can see where the money goes.",
        ],
      },
      {
        heading: "Rent and other recurring costs",
        paragraphs: [
          "There are no recurring expenses yet. Add rent as a new expense each month.",
        ],
      },
    ],
    faq: pickFaq(
      "How does Flatsby split an expense?",
      "Can I set up rent as a recurring expense?",
      "Can I move my expenses over from Splitwise?",
    ),
  },
  {
    slug: "features/ai-assistant",
    title: "AI assistant for your household | Flatsby",
    description:
      "Ask about your shared lists and expenses in plain language on the web. Get charts and tables, or have it add items and expenses for you.",
    headline: "Ask your household anything",
    intro:
      "The assistant reads your group's shopping lists and expenses and answers in plain language, with charts and tables when numbers help. It is in the web app; the iPhone and Android apps don't have it yet.",
    sections: [
      {
        heading: "What you can ask",
        bullets: [
          "How much did we spend on groceries last month?",
          "Who has paid the most this year?",
          "Add pasta, tomatoes and parmesan to the shopping list.",
          "Log 45 euros for groceries, paid by me, split equally.",
        ],
        image: SCREENSHOTS.webChat,
      },
      {
        heading: "Your data and the AI providers",
        paragraphs: [
          "The assistant asks for your consent before it sends anything. Your messages, and the list items, expenses and member names a question needs, go to OpenAI or Google through the Vercel AI Gateway to generate the answer.",
          "Automatic categories are separate from the assistant: when you add a shopping item or an expense, its name goes through the same gateway to a classification model so Flatsby can suggest a category.",
          "Your email address and sign-in details are not sent to the AI providers. Data sent for the assistant is used to generate the answer, not to train models. AI usage numbers such as the model and token counts, without your messages, go to PostHog for analytics.",
        ],
      },
      {
        heading: "Credits",
        paragraphs: [
          `The assistant and automatic categories use credits: ${PLANS.freeCredits} a month on the free plan, more on Starter and Pro. When credits run out, new items get the category Other until the next month. Lists, expenses and settling up never need credits.`,
        ],
      },
    ],
    faq: pickFaq("What does the AI assistant do?", "Is Flatsby free?"),
  },
  {
    slug: "splitwise-alternative",
    title: "Splitwise alternative for flatmates | Flatsby",
    description:
      "Flatsby vs Splitwise: no daily expense limit, no ads, a shared shopping list built in, and a Splitwise CSV import. Plus where Splitwise is better.",
    headline: "A Splitwise alternative built for shared flats",
    intro:
      "Splitwise is the default for splitting bills, and it is good at it. Flatsby is for households that also want a shared shopping list and don't want a daily limit on adding expenses.",
    table: {
      caption:
        "Flatsby and Splitwise compared. Splitwise details are from splitwise.com/pro, checked October 2026.",
      head: ["", "Flatsby", "Splitwise"],
      rows: [
        ["Shared shopping lists", "Yes, on every device", "No"],
        ["Limit on new expenses per day (free)", "None", "Yes, Pro removes it"],
        ["Ads (free)", "None", "Yes, Pro is ad-free"],
        ["Split equally, by percentage or exact amounts", "Yes", "Yes"],
        ["Debt simplification", "Yes", "Yes"],
        ["Currency conversion", "No, balances per currency", "Pro"],
        ["Receipt scanning", "No", "Pro"],
        ["Spending charts", "Through the AI assistant (uses credits)", "Pro"],
        ["Expenses outside a group", "No", "Yes"],
        ["Platforms", "Web, iPhone, Android", "Web, iPhone, Android"],
        ["Open source", "Yes, MIT license", "No"],
      ],
    },
    sections: [
      {
        heading: "Where Splitwise is better",
        paragraphs: [
          "Splitwise Pro converts currencies, scans receipts and itemizes them, and in the US imports card transactions. Splitwise also handles one-off expenses with a friend outside any group. It has been around for years and most people already have an account. If those matter more to you than a shared shopping list, stay with Splitwise.",
        ],
      },
      {
        heading: "Moving from Splitwise to Flatsby",
        bullets: [
          "In Splitwise on the web, open the group and export it as a spreadsheet (CSV).",
          "In Flatsby, create your household group and add your flatmates.",
          "Open Group settings, choose Import expenses, pick the currency and upload the CSV.",
          "Match each Splitwise name to a flatmate.",
          "Check the preview. It lists rows it will skip, such as other currencies, expenses with several payers, or splits that don't add up.",
          "Import. Each expense keeps the exact amount every person owed, so percentage splits arrive as amounts, not percentages.",
        ],
      },
    ],
    faq: pickFaq(
      "Can I move my expenses over from Splitwise?",
      "Is Flatsby free?",
      "Does Flatsby work on Android?",
    ),
  },
  {
    slug: "pricing",
    title: "Flatsby pricing: free, with optional Starter and Pro plans",
    description: `Shopping lists, expenses, settlements and groups are free with no member limit and no ads. Starter (${PLANS.starter.price}) and Pro (${PLANS.pro.price}) add AI credits.`,
    headline: "Free for the whole household",
    intro:
      "Everything a shared flat needs is free: shopping lists, expenses, settling up and groups, with no member limit and no ads. You only pay for more AI credits.",
    table: {
      caption: "Plans and monthly AI credits",
      head: ["", "Free", "Starter", "Pro"],
      rows: [
        ["Shopping lists, expenses and settlements", "Yes", "Yes", "Yes"],
        ["Members per household", "No limit", "No limit", "No limit"],
        ["Ads", "None", "None", "None"],
        [
          "AI credits per month",
          PLANS.freeCredits,
          PLANS.starter.credits,
          PLANS.pro.credits,
        ],
        [
          "Price on the web",
          "Free",
          `${PLANS.starter.price} a month`,
          `${PLANS.pro.price} a month`,
        ],
      ],
    },
    sections: [
      {
        heading: "What credits are for",
        paragraphs: [
          "The AI assistant and automatic categories use credits. When they run out, the assistant pauses and new items get the category Other until the next month. Nothing else in Flatsby uses credits.",
        ],
      },
      {
        heading: "Where to buy",
        paragraphs: [
          `On the web, open Billing after you sign in to choose Starter or Pro. The Android app links to that page. On iPhone, Pro is an in-app purchase at ${PLANS.proAppStorePrice} a month in the US App Store.`,
        ],
      },
    ],
    faq: pickFaq("Is Flatsby free?", "What does the AI assistant do?"),
  },
  {
    slug: "faq",
    title: "Flatsby FAQ: shared shopping lists and bill splitting",
    description:
      "Answers about Flatsby: price, Android and iPhone, splitting rent by percentage, moving from Splitwise, privacy and the AI assistant.",
    headline: "Questions about Flatsby",
    intro:
      "Short answers to what people ask before they move their household into Flatsby.",
    sections: [],
    faq: FAQ,
  },
] as const satisfies readonly ContentPageData[];

export function contentPageParams() {
  return CONTENT_PAGES.map((page) => ({ slug: page.slug.split("/") }));
}

export function findContentPage(
  slug: readonly string[],
): ContentPageData | undefined {
  return CONTENT_PAGES.find((page) => page.slug === slug.join("/"));
}
