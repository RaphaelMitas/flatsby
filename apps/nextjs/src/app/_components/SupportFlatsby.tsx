import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";
import { SUPPORT_EMAIL } from "@flatsby/validators/billing";

export function SupportFlatsby() {
  const t = useTranslations("billing.support");
  return (
    <Card data-testid="support-flatsby">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground flex flex-col gap-3 text-sm">
        <p>{t("free")}</p>
        <p>{t("shutdown")}</p>
        <p>{t("cost")}</p>
        <p>
          {t("chipIn")}{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-primary underline"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
