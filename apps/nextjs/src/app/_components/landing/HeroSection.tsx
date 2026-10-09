"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Globe, Play } from "lucide-react";

import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import AppleIcon from "@flatsby/ui/custom/icons/AppleIcon";
import FlatsbyCat from "@flatsby/ui/custom/icons/FlatsbyCat";

import {
  APP_STORE_URL,
  HEADLINE,
  PLAY_STORE_URL,
  SUBHEADLINE,
} from "./content";

export type Platform = "ios" | "android" | "other";

const WEB = { href: "/auth/login", label: "Open in Browser", icon: Globe };
const APP_STORE = {
  href: APP_STORE_URL,
  label: "Download on the App Store",
  icon: AppleIcon,
};
const PLAY_STORE = {
  href: PLAY_STORE_URL,
  label: "Get it on Google Play",
  icon: Play,
};

function orderFor(platform: Platform) {
  if (platform === "ios") return [APP_STORE, WEB, PLAY_STORE];
  if (platform === "android") return [PLAY_STORE, WEB, APP_STORE];
  return [WEB, APP_STORE, PLAY_STORE];
}

export function HeroSection({ platform }: { platform: Platform }) {
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
          {HEADLINE}
        </h1>
        <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg md:text-xl">
          {SUBHEADLINE}
        </p>
        <div className="flex w-full flex-col items-center gap-4">
          {orderFor(platform).map((store, index) => (
            <Button
              key={store.href}
              variant={index === 0 ? "default" : "outline"}
              size="lg"
              className="w-full max-w-72"
              asChild
            >
              <Link
                href={store.href}
                {...(store.href.startsWith("http") && {
                  target: "_blank",
                  rel: "noopener noreferrer",
                })}
              >
                <store.icon className="h-5 w-5 text-current" />
                {store.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
