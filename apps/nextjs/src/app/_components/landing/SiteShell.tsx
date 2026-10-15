import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { localeNames, localePath, locales } from "@flatsby/i18n/locale";
import { Button } from "@flatsby/ui/button";
import FlatsbyCat from "@flatsby/ui/custom/icons/FlatsbyCat";

import {
  APP_STORE_URL,
  GITHUB_URL,
  LEGAL_PAGES,
  PLAY_STORE_URL,
} from "./content";

export function SiteShell({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const t = useTranslations("marketing.nav");
  const local = (href: string) => localePath(locale, href);

  const nav = [
    { href: local("/features/shopping-lists"), label: t("shoppingLists") },
    { href: local("/features/expenses"), label: t("expenses") },
    {
      href: local("/splitwise-alternative"),
      label: t("splitwiseAlternative"),
    },
    { href: local("/pricing"), label: t("pricing") },
    { href: local("/faq"), label: t("faq") },
  ];

  const footerGroups = [
    {
      title: t("product"),
      links: [
        { href: local("/features/shopping-lists"), label: t("shoppingLists") },
        { href: local("/features/expenses"), label: t("expenseSplitting") },
        { href: local("/features/ai-assistant"), label: t("aiAssistant") },
        {
          href: local("/splitwise-alternative"),
          label: t("splitwiseAlternative"),
        },
        { href: local("/pricing"), label: t("pricing") },
        { href: local("/faq"), label: t("faq") },
      ],
    },
    {
      title: t("getTheApp"),
      links: [
        { href: "/auth/login", label: t("webApp") },
        { href: APP_STORE_URL, label: t("appStore") },
        { href: PLAY_STORE_URL, label: t("googlePlay") },
        { href: GITHUB_URL, label: t("sourceCode") },
      ],
    },
    {
      title: t("legal"),
      links: LEGAL_PAGES.map((page) => ({
        href: local(page.path),
        label: t(page.id),
      })),
    },
  ];

  return (
    <div className="bg-background h-screen overflow-auto">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href={local("/")} className="flex items-center gap-2">
            <FlatsbyCat />
            <span className="text-xl font-semibold">Flatsby</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {nav.map((link) => (
              <Button key={link.href} variant="ghost" size="sm" asChild>
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </nav>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login">{t("signIn")}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth/login">{t("getStarted")}</Link>
            </Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <nav key={group.title} className="flex flex-col gap-2 text-sm">
              <p className="font-medium">{group.title}</p>
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <LanguageLinks path={path} />
        <p className="text-muted-foreground pb-8 text-center text-sm">
          Flatsby {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

export function LanguageLinks({ path }: { path: string }) {
  const current = useLocale();
  const t = useTranslations("marketing.nav");
  return (
    <nav
      aria-label={t("language")}
      className="flex justify-center gap-4 pb-4 text-sm"
    >
      {locales.map((locale) =>
        locale === current ? (
          <span key={locale} lang={locale} className="font-medium">
            {localeNames[locale]}
          </span>
        ) : (
          <Link
            key={locale}
            href={localePath(locale, path)}
            hrefLang={locale}
            lang={locale}
            className="text-muted-foreground hover:text-foreground"
          >
            {localeNames[locale]}
          </Link>
        ),
      )}
    </nav>
  );
}
