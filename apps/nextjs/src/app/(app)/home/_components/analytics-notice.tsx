"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";

import { useTRPC } from "~/trpc/react";

const seenKey = "analytics_notice_seen";

// Art. 21(4) GDPR: accounts from before the sign-in line learn of the right to object once
export function AnalyticsNotice() {
  const t = useTranslations("settings.analytics");
  const trpc = useTRPC();
  const { data: user } = useQuery(trpc.user.getCurrentUser.queryOptions());
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    setSeen(localStorage.getItem(seenKey) !== null);
  }, []);

  if (seen || !user || user.analyticsOptOut) return null;

  const dismiss = () => {
    setSeen(true);
    localStorage.setItem(seenKey, "true");
  };

  return (
    <div
      data-testid="analytics-notice"
      className="bg-muted flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
    >
      <p className="flex-1">
        {t.rich("rightToObject", {
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("dismiss")}
        data-testid="analytics-notice-dismiss"
        onClick={dismiss}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
