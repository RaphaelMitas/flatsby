import Link from "next/link";

import { Button } from "@flatsby/ui/button";
import FlatsbyCat from "@flatsby/ui/custom/icons/FlatsbyCat";

import {
  APP_STORE_URL,
  GITHUB_URL,
  LEGAL_PAGES,
  PLAY_STORE_URL,
} from "./content";

const NAV = [
  { href: "/features/shopping-lists", label: "Shopping lists" },
  { href: "/features/expenses", label: "Expenses" },
  { href: "/splitwise-alternative", label: "Splitwise alternative" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

const FOOTER_GROUPS = [
  {
    title: "Product",
    links: [
      { href: "/features/shopping-lists", label: "Shopping lists" },
      { href: "/features/expenses", label: "Expense splitting" },
      { href: "/features/ai-assistant", label: "AI assistant" },
      { href: "/splitwise-alternative", label: "Splitwise alternative" },
      { href: "/pricing", label: "Pricing" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Get the app",
    links: [
      { href: "/auth/login", label: "Web app" },
      { href: APP_STORE_URL, label: "App Store" },
      { href: PLAY_STORE_URL, label: "Google Play" },
      { href: GITHUB_URL, label: "Source code" },
    ],
  },
  {
    title: "Legal",
    links: LEGAL_PAGES.map((page) => ({ href: page.path, label: page.label })),
  },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background h-screen overflow-auto">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <FlatsbyCat />
            <span className="text-xl font-semibold">Flatsby</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {NAV.map((link) => (
              <Button key={link.href} variant="ghost" size="sm" asChild>
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </nav>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          {FOOTER_GROUPS.map((group) => (
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
        <p className="text-muted-foreground pb-8 text-center text-sm">
          Flatsby {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
