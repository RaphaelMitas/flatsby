import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";

export function CTASection() {
  const t = useTranslations("marketing.cta");
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">{t("heading")}</h2>
        <p className="text-muted-foreground mb-8 text-lg">{t("note")}</p>
        <Button size="lg" asChild>
          <Link href="/auth/login">{t("button")}</Link>
        </Button>
      </div>
    </section>
  );
}
