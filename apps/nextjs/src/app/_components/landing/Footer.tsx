import Link from "next/link";

import { Button } from "@flatsby/ui/button";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-muted-foreground text-sm">
            Flatsby {new Date().getFullYear()}
          </p>
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
            <Link href="/legal/legal-notice">
              <Button variant="ghost" size="sm">
                Legal Notice
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
