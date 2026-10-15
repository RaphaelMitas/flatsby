import { Home, LogIn, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardDescription, CardHeader, CardTitle } from "@flatsby/ui/card";

import { STEPS } from "./content";

const ICONS = { signIn: LogIn, createGroup: Home, addFlatmates: UserPlus };

export function HowItWorksSection() {
  const t = useTranslations("marketing.steps");
  return (
    <section className="bg-muted/50 px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
          {t("heading")}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = ICONS[step];
            return (
              <Card key={step} className="relative">
                <CardHeader>
                  <div className="bg-primary text-primary-foreground absolute -top-3 left-4 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="text-primary bg-primary/10 mb-2 flex h-10 w-10 items-center justify-center rounded-lg">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">
                    {t(`${step}.title`)}
                  </CardTitle>
                  <CardDescription>{t(`${step}.body`)}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
