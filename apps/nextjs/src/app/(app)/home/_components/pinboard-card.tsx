"use client";

import { useTranslations } from "next-intl";

import { HomeCard, useHomeCardOpened } from "./home-card";

export function PinboardCard({ groupId }: { groupId: number }) {
  const t = useTranslations();
  const opened = useHomeCardOpened(groupId);

  return (
    <HomeCard
      href="/home/pinboard"
      title={t("pinboard.title")}
      testId="home-card-pinboard"
      onOpen={() => opened("pinboard")}
    >
      <p className="mt-2">{t("pinboard.homeHint")}</p>
    </HomeCard>
  );
}
