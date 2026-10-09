import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@flatsby/ui/button";

import { LEGAL_PAGES } from "~/app/_components/landing/content";

export const metadata: Metadata = { robots: "index,follow" };

export default function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="bg-background h-screen overflow-auto">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-semibold">
            Flatsby
          </Link>
          <nav className="flex gap-2">
            {LEGAL_PAGES.map((page) => (
              <Button key={page.path} variant="ghost" size="sm" asChild>
                <Link href={page.path}>{page.label}</Link>
              </Button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      <footer className="border-t">
        <div className="mx-auto max-w-4xl px-4 py-6 text-center text-sm text-gray-500">
          Flatsby {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
