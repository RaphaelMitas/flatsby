import { useTranslations } from "next-intl";

import { BillingContent } from "./_components/billing-content";

export default function BillingPage() {
  const t = useTranslations("billing");
  return (
    <div className="flex flex-col p-4 md:pt-16">
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <BillingContent />
      </div>
    </div>
  );
}
