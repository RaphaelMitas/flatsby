// One source for every fact on the site, so the pages, JSON-LD and .md twins can't disagree.

export const SITE_URL = "https://www.flatsby.com";
export const APP_STORE_URL = "https://apps.apple.com/app/flatsby/id6747908544";
export const APP_STORE_ID = "6747908544";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.flatcove.app";
export const GITHUB_URL = "https://github.com/RaphaelMitas/flatsby";
export const UPDATED = "2026-10-09";

export const PLANS = {
  freeCredits: "5,000",
  starter: { price: "$4.99", credits: "40,000" },
  pro: { price: "$9.99", credits: "100,000" },
  proAppStorePrice: "$7.99",
};

export const LEGAL_PAGES = [
  { path: "/legal/terms", label: "Terms" },
  { path: "/legal/privacy", label: "Privacy" },
  { path: "/legal/legal-notice", label: "Legal notice" },
] as const;

export const TITLE = "Flatsby: shared shopping list and bill splitting app";
export const DESCRIPTION =
  "Free app for flatmates and roommates: one shared shopping list and bills split equally, by percentage or exact amounts. Web, iPhone and Android.";
export const HEADLINE =
  "Shared shopping lists and bill splitting for flatmates";
export const FREE_ON = "Free on web, iPhone and Android";
export const SUBHEADLINE = `One shopping list for the whole household, expenses split equally, by percentage or exact amounts, and a running balance of who owes whom. ${FREE_ON}.`;

export const FEATURES = [
  {
    title: "Shared shopping lists",
    body: "Everyone in the household works from the same lists on the web and on their phone. Whoever is in the shop ticks items off, and everyone else sees it the next time they open the list.",
  },
  {
    title: "Expense splitting",
    body: "Log what you paid and split it equally, by percentage or by exact amounts. Flatsby keeps a running balance per person and simplifies debts, so fewer payments settle everyone up.",
  },
  {
    title: "AI assistant",
    body: "On the web, ask about your household in plain language. It reads your lists and expenses, answers with charts and tables, and can add items or expenses for you.",
  },
  {
    title: "Household groups",
    body: "A group is your household. Each flatmate signs in once, then a group admin adds them by the email on their account. Every list and expense stays inside the group.",
  },
] as const;

export const STEPS = [
  {
    title: "Sign in",
    body: "Use your Google or Apple account on the web or in the iPhone or Android app.",
  },
  {
    title: "Create your household",
    body: "Make a group for your home. You become its admin.",
  },
  {
    title: "Add flatmates",
    body: "Once they have signed in, add them to the group by their email.",
  },
] as const;

export const SECTIONS = [
  {
    id: "splitwise",
    title: "Switching from Splitwise",
    body: "Flatsby imports a Splitwise CSV export, so your history comes with you. In Splitwise, export the group as CSV. In Flatsby, open Group settings, Import expenses, pick the currency, match the Splitwise names to your flatmates and upload the file. The preview lists any rows it skips, such as other currencies or expenses with several payers, before anything is imported.",
  },
  {
    id: "about",
    title: "Who makes Flatsby",
    body: "Flatsby is built by Raphael Mitas, an independent developer in Darmstadt, Germany. The code is open source on GitHub, and releases ship to the web, the App Store and Google Play from the same repository.",
  },
] as const;

export const FACTS = [
  {
    label: "What it is",
    value:
      "A household app for people who live together: shared shopping lists, shared expenses and settling up.",
  },
  {
    label: "Who it is for",
    value: "Flatmates or roommates, couples and families who share a home.",
  },
  {
    label: "Platforms",
    value:
      "Web at flatsby.com, iPhone and Android. Same account and data everywhere.",
  },
  {
    label: "Price",
    value: `Free. AI features use monthly credits: ${PLANS.freeCredits} free, more on Starter (${PLANS.starter.price} a month) or Pro (${PLANS.pro.price} a month on the web, ${PLANS.proAppStorePrice} in the US App Store).`,
  },
  { label: "Sign in", value: "Google or Apple account." },
  {
    label: "Splitting",
    value: "Equal, percentage or exact amounts. EUR, USD and GBP.",
  },
  { label: "Switching", value: "Imports a Splitwise CSV export." },
  { label: "Limits", value: "No member limit. No recurring expenses yet." },
  {
    label: "Your data",
    value: "Export everything or delete your account from settings.",
  },
  {
    label: "Source code",
    value: "Open source, MIT license. No public API for other apps.",
  },
] as const;

export const FAQ = [
  {
    question: "Is Flatsby free?",
    answer: `Yes. Shopping lists, expenses, settlements and groups are free, with no member limit. The AI assistant and automatic categories use credits: ${PLANS.freeCredits} a month for free, ${PLANS.starter.credits} on Starter (${PLANS.starter.price} a month) and ${PLANS.pro.credits} on Pro (${PLANS.pro.price} a month on the web). On iPhone, Pro is ${PLANS.proAppStorePrice} a month in the US App Store.`,
  },
  {
    question: "Does Flatsby work on Android?",
    answer:
      "Yes. Flatsby is in the Google Play Store, the App Store and on the web at flatsby.com. It is the same account and the same data on every device.",
  },
  {
    question: "Can I move my expenses over from Splitwise?",
    answer:
      "Yes. Export your group from Splitwise as CSV, then upload it under Group settings, Import expenses. You pick the currency and match Splitwise names to your flatmates. Each expense keeps the exact amount every person owed, so percentage splits arrive as amounts. Rows in other currencies or with several payers are skipped, and the preview lists them first.",
  },
  {
    question: "How does Flatsby split an expense?",
    answer:
      "Equally, by percentage, or by exact amounts per person. Expenses can be in EUR, USD or GBP, and Flatsby keeps a running balance per person for each currency.",
  },
  {
    question: "Can I set up rent as a recurring expense?",
    answer:
      "Not yet. Add rent as a new expense each month. Each expense keeps its own split, so a 60/40 rent split and a 50/50 grocery split can sit in the same balance.",
  },
  {
    question: "How many people can be in a household?",
    answer:
      "There is no member limit. A group admin adds each flatmate by the email they signed in with.",
  },
  {
    question: "Is the web app the same as the phone apps?",
    answer:
      "Almost. Lists, expenses, settlements and group settings work on the web, iPhone and Android. The AI assistant is web only for now.",
  },
  {
    question: "Do shopping lists update in real time?",
    answer:
      "Not instantly. Everyone shares the same lists, and a flatmate's changes show up when you open the list again or come back to the app or tab.",
  },
  {
    question: "What does the AI assistant do?",
    answer:
      "In the web app, you ask about your household in plain language. It reads your lists and expenses, answers with charts and tables, and can add items or expenses for you.",
  },
  {
    question: "Who can see my household's data?",
    answer:
      "Inside Flatsby, only members of your group. The hosting, analytics and AI providers listed in the privacy policy process it to run the app. Two features send data through the Vercel AI Gateway. The AI assistant asks for consent first, uses OpenAI or Google models, and its data is not used to train them. Automatic categories send the names of shopping items and expenses to a classification model. You can export all of your data or delete your account from your settings.",
  },
  {
    question: "Is Flatsby open source?",
    answer:
      "Yes. The code for the web app, the mobile apps and the server is on GitHub under the MIT license. There is no public API for other apps.",
  },
] as const;

export interface FaqItem {
  question: string;
  answer: string;
}

type FaqQuestion = (typeof FAQ)[number]["question"];

export function pickFaq(...questions: FaqQuestion[]) {
  return FAQ.filter((item) => questions.includes(item.question));
}

export const HOME_FAQ = pickFaq(
  "Is Flatsby free?",
  "Does Flatsby work on Android?",
  "Can I move my expenses over from Splitwise?",
  "How does Flatsby split an expense?",
  "Who can see my household's data?",
);

export const CTA_NOTE = `${FREE_ON}. Sign in with Google or Apple.`;
