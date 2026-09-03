"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Globe } from "lucide-react";

import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import AppleIcon from "@flatsby/ui/custom/icons/AppleIcon";
import FlatsbyCat from "@flatsby/ui/custom/icons/FlatsbyCat";

export function HeroSection({ isIOS }: { isIOS: boolean }) {
  const [excited, setExcited] = useState(false);
  const [hops, setHops] = useState(0);
  const lastHop = useRef(0);

  const playHop = useCallback(() => {
    const now = Date.now();
    if (now - lastHop.current < 250) return;
    lastHop.current = now;
    setHops((n) => n + 1);
  }, []);

  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <div
          className="relative mx-auto h-14 w-28 cursor-pointer overflow-hidden select-none"
          onPointerEnter={() => {
            setExcited(true);
            playHop();
          }}
          onPointerLeave={() => setExcited(false)}
          onClick={playHop}
        >
          <FlatsbyCat
            key={hops}
            className={cn(
              "absolute top-0 left-1/2 h-28 -translate-x-1/2",
              excited && "fc-excited",
              hops > 0 && "fc-hopping",
            )}
          />
        </div>
        <h1
          className="mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl"
          data-testid="hero-title"
        >
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
