import Link from "next/link";

import { Button } from "@flatsby/ui/button";

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
            <Link href="/legal/terms">
              <Button variant="ghost" size="sm">
                Terms
              </Button>
            </Link>
            <Link href="/legal/privacy">
              <Button variant="ghost" size="sm">
                Privacy
              </Button>
            </Link>
            <Link href="/legal/impressum">
              <Button variant="ghost" size="sm">
                Impressum
              </Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      <footer className="border-t">
        <div className="mx-auto max-w-4xl px-4 py-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Flatsby. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
