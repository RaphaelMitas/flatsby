import Link from "next/link";
import { Globe } from "lucide-react";

import { Badge } from "@flatsby/ui/badge";
import { Button } from "@flatsby/ui/button";
import AppleIcon from "@flatsby/ui/custom/icons/AppleIcon";

export function HeroSection({ isIOS }: { isIOS: boolean }) {
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <Badge variant="secondary" className="mb-4">
          Free for all
        </Badge>
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          Household management, simplified.
        </h1>
        <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg md:text-xl">
          Share shopping lists, split expenses, and stay organized with your
          flatmates.
        </p>
        <div className="flex w-full flex-col items-center gap-4">
          {isIOS ? (
            <>
              <Button size="lg" className="w-full max-w-72" asChild>
                <a
                  href="https://apps.apple.com/de/app/flatsby/id6747908544?l=en-GB"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <AppleIcon className="text-primary-foreground h-5 w-5" />
                  Download on the App Store
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full max-w-72"
                asChild
              >
                <Link href="/auth/login">
                  <Globe className="h-5 w-5" />
                  Open in Browser
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" className="w-full max-w-72" asChild>
                <Link href="/auth/login">
                  <Globe className="h-5 w-5" />
                  Open in Browser
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full max-w-72"
                asChild
              >
                <a
                  href="https://apps.apple.com/de/app/flatsby/id6747908544"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <AppleIcon className="h-5 w-5" />
                  Available on the App Store
                </a>
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
