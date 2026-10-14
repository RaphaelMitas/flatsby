import type { Locale } from "@flatsby/i18n/locale";
import type { Metadata } from "next";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { localePath } from "@flatsby/i18n/locale";
import { Button } from "@flatsby/ui/button";

import { LEGAL_PAGES } from "~/app/_components/landing/content";
import { localeAlternates } from "~/app/_components/landing/i18n";
import { LanguageLinks } from "~/app/_components/landing/SiteShell";

export function legalMetadata(
  locale: Locale,
  path: string,
  { title, description }: { title: string; description: string },
): Metadata {
  return {
    title,
    description,
    robots: "index,follow",
    alternates: {
      canonical: localePath(locale, path),
      languages: localeAlternates(path),
    },
  };
}

export function LegalShell({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const t = useTranslations("marketing.nav");
  return (
    <div className="bg-background h-screen overflow-auto">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link
            href={localePath(locale, "/")}
            className="text-xl font-semibold"
          >
            Flatsby
          </Link>
          <nav className="flex gap-2">
            {LEGAL_PAGES.map((page) => (
              <Button key={page.path} variant="ghost" size="sm" asChild>
                <Link href={localePath(locale, page.path)}>{t(page.id)}</Link>
              </Button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      <footer className="border-t">
        <div className="mx-auto max-w-4xl px-4 py-6 text-center text-sm text-gray-500">
          <LanguageLinks path={path} />
          Flatsby {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
