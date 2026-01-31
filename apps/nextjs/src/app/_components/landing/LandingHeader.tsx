import Link from "next/link";

import { Button } from "@flatsby/ui/button";
import HomeIcon from "@flatsby/ui/custom/icons/HomeIcon";

export function LandingHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <HomeIcon className="text-primary h-6 w-10" />
          <span className="text-xl font-semibold">Flatsby</span>
        </Link>
        <nav className="flex gap-2">
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="sm">Get Started</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
