import type { LucideIcon } from "lucide-react";
import { Bot, ShoppingCart, Users, Wallet } from "lucide-react";
import {
  NextIntlClientProvider,
  useMessages,
  useTranslations,
} from "next-intl";

import { Avatar, AvatarFallback } from "@flatsby/ui/avatar";

import { ChatDemo } from "./ChatDemo";
import { ExpenseDemo } from "./ExpenseDemo";
import { ShoppingListDemo } from "./ShoppingListDemo";

export function FeaturesSection() {
  const t = useTranslations("marketing.features");
  const {
    common,
    expenses,
    expenseCategories,
    shoppingCategories,
    chat,
    marketing,
  } = useMessages();
  // The demos reuse app components, which translate in the browser.
  const demoMessages = {
    common,
    expenses,
    expenseCategories,
    shoppingCategories,
    chat: { elements: chat.elements, toolResults: chat.toolResults },
    marketing: { demo: marketing.demo },
  };

  return (
    <section id="features" className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">
          {t("heading")}
        </h2>
        <p className="text-muted-foreground mb-12 text-center text-sm">
          {t("examples")}
        </p>

        <NextIntlClientProvider messages={demoMessages}>
          <div className="flex flex-col gap-16 md:gap-24">
            <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
              <FeatureText
                className="order-2 md:order-1"
                icon={ShoppingCart}
                title={t("lists.title")}
                body={t("lists.body")}
              />
              <div className="order-1 md:order-2">
                <ShoppingListDemo />
              </div>
            </div>
            <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
              <div className="order-1">
                <ExpenseDemo />
              </div>
              <FeatureText
                className="order-2"
                icon={Wallet}
                title={t("expenses.title")}
                body={t("expenses.body")}
              />
            </div>
            <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
              <FeatureText
                className="order-2 md:order-1"
                icon={Bot}
                title={t("assistant.title")}
                body={t("assistant.body")}
              />
              <div className="order-1 md:order-2">
                <ChatDemo />
              </div>
            </div>
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-primary bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-2xl font-semibold">
                {t("groups.title")}
              </h3>
              <p className="text-muted-foreground mb-6">{t("groups.body")}</p>
              <div className="flex justify-center">
                <div className="flex -space-x-3">
                  {["AL", "SA", "JO", "+2"].map((initials) => (
                    <Avatar
                      key={initials}
                      className="border-background h-10 w-10 border-2"
                    >
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </NextIntlClientProvider>
      </div>
    </section>
  );
}

function FeatureText({
  className,
  icon: Icon,
  title,
  body,
}: {
  className: string;
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className={className}>
      <div className="text-primary bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mb-3 text-2xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{body}</p>
    </div>
  );
}
