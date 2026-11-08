// One source for every fact on the site, so the pages, JSON-LD and .md twins can't disagree.

import type { InviteReferrer } from "@flatsby/validators/invite";

import { inviteReferrer } from "@flatsby/validators/invite";
import { APP_STORE_ID, PLAY_STORE_URL } from "@flatsby/validators/store";

import type { MarketingTranslator } from "./i18n";

export const SITE_URL = "https://www.flatsby.com";
export const GITHUB_URL = "https://github.com/RaphaelMitas/flatsby";
export const UPDATED = "2026-11-08";

export const APP_STORE_LINK = "/get/ios";
export const PLAY_STORE_LINK = "/get/android";

export const storeLinkProps = (href: string) =>
  href === APP_STORE_LINK || href === PLAY_STORE_LINK
    ? ({ target: "_blank", rel: "noopener", prefetch: false } as const)
    : {};

// Campaign tags make the website show up as an install source in App Store Connect and Play Console
export function storeRedirect(pathname: string, invite: InviteReferrer | null) {
  if (pathname === APP_STORE_LINK) {
    return {
      store: "ios",
      url: `https://apps.apple.com/app/apple-store/id${APP_STORE_ID}?pt=121729394&ct=flatsby.com&mt=8`,
    };
  }
  if (pathname === PLAY_STORE_LINK) {
    const referrer = invite ? inviteReferrer(invite) : new URLSearchParams();
    referrer.set("utm_source", "flatsby.com");
    return {
      store: "android",
      url: `${PLAY_STORE_URL}&referrer=${encodeURIComponent(referrer.toString())}`,
    };
  }
  return undefined;
}

export const LEGAL_PAGES = [
  { path: "/legal/terms", id: "terms" },
  { path: "/legal/privacy", id: "privacy" },
  { path: "/legal/legal-notice", id: "legalNotice" },
] as const;

export const FEATURES = ["calendar", "lists", "expenses", "groups"] as const;

export const STEPS = ["signIn", "createGroup", "addFlatmates"] as const;

export const SECTIONS = ["splitwise", "about"] as const;

export const FACTS = [
  "whatItIs",
  "audience",
  "platforms",
  "price",
  "signIn",
  "splitting",
  "switching",
  "limits",
  "data",
  "source",
] as const;

export const FAQ = [
  "free",
  "android",
  "splitwise",
  "split",
  "rent",
  "members",
  "web",
  "realtime",
  "privacy",
  "chores",
  "flatastic",
  "openSource",
] as const;

export type FaqKey = (typeof FAQ)[number];

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqItems(
  t: MarketingTranslator,
  keys: readonly FaqKey[],
): FaqItem[] {
  return FAQ.filter((key) => keys.includes(key)).map((key) => ({
    question: t(`faq.${key}.question`),
    answer: t(`faq.${key}.answer`),
  }));
}

export const HOME_FAQ = [
  "free",
  "android",
  "splitwise",
  "split",
  "privacy",
] as const satisfies readonly FaqKey[];
