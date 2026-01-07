"use client";

import { useCustomer } from "autumn-js/react";
import { ExternalLinkIcon, Loader2Icon } from "lucide-react";

import PricingTable from "@flatsby/ui/autumn/pricing-table";
import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";

import { env } from "~/env";
import { UsageDisplay } from "./usage-display";

export function BillingContent() {
  const { customer, isLoading, openBillingPortal } = useCustomer();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2Icon className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const currentProduct = customer?.products[0];

  return (
    <div className="grid gap-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Your current subscription and billing details
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-medium">{currentProduct?.name ?? "Free Plan"}</p>
            <p className="text-muted-foreground text-sm">
              {currentProduct?.status ?? "Active"}
            </p>
          </div>
          {currentProduct && currentProduct.id !== "free" && (
            <Button
              variant="outline"
              onClick={async () => {
                await openBillingPortal({
                  returnUrl: `${env.NEXT_PUBLIC_BETTER_AUTH_BASE_URL}/billing`,
                });
              }}
            >
              Manage Subscription
              <ExternalLinkIcon className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Usage Card */}
      <UsageDisplay />

      {/* Pricing Table */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Choose the plan that best fits your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PricingTable />
        </CardContent>
      </Card>
    </div>
  );
}
