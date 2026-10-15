import Link from "next/link";
import { Globe, Play } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";
import AppleIcon from "@flatsby/ui/custom/icons/AppleIcon";

import { PeekingCat } from "../peeking-cat";
import { APP_STORE_URL, PLAY_STORE_URL } from "./content";

export type Platform = "ios" | "android" | "other";

const WEB = { href: "/auth/login", id: "openInBrowser", icon: Globe } as const;
const APP_STORE = {
  href: APP_STORE_URL,
  id: "appStore",
  icon: AppleIcon,
} as const;
const PLAY_STORE = {
  href: PLAY_STORE_URL,
  id: "googlePlay",
  icon: Play,
} as const;

function orderFor(platform: Platform) {
  if (platform === "ios") return [APP_STORE, WEB, PLAY_STORE];
  if (platform === "android") return [PLAY_STORE, WEB, APP_STORE];
  return [WEB, APP_STORE, PLAY_STORE];
}

export function HeroSection({ platform }: { platform: Platform }) {
  const t = useTranslations("marketing");
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <PeekingCat className="mx-auto h-14 w-28" />
        <h1
          className="mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl"
          data-testid="hero-title"
        >
          {t("headline")}
        </h1>
        <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg md:text-xl">
          {t("subheadline")}
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
                {t(`hero.${store.id}`)}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
