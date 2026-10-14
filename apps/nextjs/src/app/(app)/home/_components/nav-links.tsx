"use client";

import Link from "next/link";
import { ChevronRight, ShoppingCart, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@flatsby/ui/card";

interface NavLinkItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

function NavLinkItem({ href, icon, label }: NavLinkItemProps) {
  return (
    <Link href={href}>
      <Card className="hover:bg-accent transition-colors">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="text-muted-foreground">{icon}</div>
            <span className="font-medium">{label}</span>
          </div>
          <ChevronRight className="text-muted-foreground h-5 w-5" />
        </CardContent>
      </Card>
    </Link>
  );
}

export function NavLinks() {
  const t = useTranslations();
  return (
    <div className="flex flex-col gap-4">
      <NavLinkItem
        href="/shopping-list"
        icon={<ShoppingCart className="h-5 w-5" />}
        label={t("home.shoppingLists")}
      />
      <NavLinkItem
        href="/expenses"
        icon={<Wallet className="h-5 w-5" />}
        label={t("navigation.expenses")}
      />
    </div>
  );
}
