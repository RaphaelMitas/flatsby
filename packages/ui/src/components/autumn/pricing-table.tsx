import React, { createContext, useContext, useState } from "react";
import { useCustomer, useListPlans } from "autumn-js/react";
import { CheckIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@flatsby/ui";
import { getCurrentSubscription, PLAN_IDS } from "@flatsby/validators/billing";

import { Badge } from "../../badge";
import { Button } from "../../button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../card";
import { Separator } from "../../separator";
import { Skeleton } from "../../skeleton";
import { Switch } from "../../switch";

type Plan = NonNullable<ReturnType<typeof useListPlans>["data"]>[number];

export default function PricingTable() {
  const {
    data: customer,
    attach,
    updateSubscription,
    refetch: refetchCustomer,
  } = useCustomer({ errorOnNotFound: false });

  const [isAnnual, setIsAnnual] = useState(false);
  const {
    data: plans,
    isLoading,
    error,
    refetch: refetchPlans,
  } = useListPlans();

  if (isLoading) {
    return (
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        {Array.from({ length: 3 }).map((_, i) => (
          <PricingCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return <div> Something went wrong...</div>;
  }

  const currentPlanId = getCurrentSubscription(
    customer?.subscriptions ?? [],
  )?.planId;
  const hasApplePlan = currentPlanId === PLAN_IDS.PRO_APPLE;

  const filteredPlans = plans?.filter((plan) => {
    if (hasApplePlan) {
      return plan.id === PLAN_IDS.PRO_APPLE;
    }
    return plan.id !== PLAN_IDS.PRO_APPLE;
  });

  const getIntervalGroup = (plan: Plan): string | undefined => {
    if (!plan.price) return undefined;
    const interval = plan.price.interval;
    if (!interval || interval === "one_off") return undefined;
    if (interval === "year" || interval === "semi_annual") return "year";
    return "month";
  };

  const intervals = Array.from(
    new Set(filteredPlans?.map((p) => getIntervalGroup(p)).filter((i) => !!i)),
  );

  const multiInterval = intervals.length > 1;

  const recommendedPlanId =
    filteredPlans?.find(
      (p) => p.customerEligibility?.attachAction === "upgrade",
    )?.id ?? PLAN_IDS.STARTER;

  const intervalFilter = (plan: Plan) => {
    const group = getIntervalGroup(plan);
    if (!group) return true;

    if (multiInterval) {
      if (isAnnual) {
        return group === "year";
      } else {
        return group === "month";
      }
    }

    return true;
  };

  return (
    <div className={cn("root")}>
      {filteredPlans && (
        <PricingTableContainer
          plans={filteredPlans}
          isAnnualToggle={isAnnual}
          setIsAnnualToggle={setIsAnnual}
          multiInterval={multiInterval}
        >
          {filteredPlans.filter(intervalFilter).map((plan, index) => {
            const isApplePlan = plan.id === PLAN_IDS.PRO_APPLE;
            const eligibility = plan.customerEligibility;
            return (
              <PricingCard
                key={index}
                planId={plan.id}
                isRecommended={plan.id === recommendedPlanId}
                disclaimer={
                  isApplePlan
                    ? "To cancel, go to App Store subscriptions"
                    : undefined
                }
                buttonProps={{
                  disabled: isApplePlan || eligibility?.attachAction === "none",

                  onClick: async () => {
                    if (!plan.id || !customer) return;

                    const pendingCancelSub = customer.subscriptions.find(
                      (s) => s.canceledAt !== null,
                    );

                    try {
                      if (pendingCancelSub && eligibility?.canceling === true) {
                        await updateSubscription({
                          planId: pendingCancelSub.planId,
                          cancelAction: "uncancel",
                        });
                      } else {
                        await attach({ planId: plan.id });
                      }
                      await Promise.all([refetchCustomer(), refetchPlans()]);
                    } catch {
                      toast.error("Failed to update plan. Please try again.");
                    }
                  },
                }}
              />
            );
          })}
        </PricingTableContainer>
      )}
    </div>
  );
}

const PricingTableContext = createContext<{
  isAnnualToggle: boolean;
  setIsAnnualToggle: (isAnnual: boolean) => void;
  plans: Plan[];
  showFeatures: boolean;
}>({
  isAnnualToggle: false,
  setIsAnnualToggle: () => {
    /* empty */
  },
  plans: [],
  showFeatures: true,
});

export const usePricingTableContext = (componentName: string) => {
  const context = useContext(PricingTableContext);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (context === undefined) {
    throw new Error(`${componentName} must be used within <PricingTable />`);
  }

  return context;
};

export const PricingTableContainer = ({
  children,
  plans,
  showFeatures = true,
  className,
  isAnnualToggle,
  setIsAnnualToggle,
  multiInterval,
}: {
  children?: React.ReactNode;
  plans?: Plan[];
  showFeatures?: boolean;
  className?: string;
  isAnnualToggle: boolean;
  setIsAnnualToggle: (isAnnual: boolean) => void;
  multiInterval: boolean;
}) => {
  if (!plans) {
    throw new Error("plans is required in <PricingTable />");
  }

  if (plans.length === 0) {
    return <></>;
  }

  return (
    <PricingTableContext.Provider
      value={{ isAnnualToggle, setIsAnnualToggle, plans, showFeatures }}
    >
      <div className={cn("flex flex-col items-center")}>
        {multiInterval && (
          <div>
            <AnnualSwitch
              isAnnualToggle={isAnnualToggle}
              setIsAnnualToggle={setIsAnnualToggle}
            />
          </div>
        )}
        <div
          className={cn(
            "grid w-full grid-cols-1 gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </PricingTableContext.Provider>
  );
};

interface PricingCardProps {
  planId: string;
  isRecommended?: boolean;
  showFeatures?: boolean;
  className?: string;
  disclaimer?: string;
  onButtonClick?: (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void | Promise<void>;
  buttonProps?: Omit<React.ComponentProps<"button">, "onClick"> & {
    onClick?: (
      event: React.MouseEvent<HTMLButtonElement>,
    ) => void | Promise<void>;
  };
}

export const PricingCard = ({
  planId,
  isRecommended,
  className,
  disclaimer,
  buttonProps,
}: PricingCardProps) => {
  const { plans, showFeatures } = usePricingTableContext("PricingCard");

  const plan = plans.find((p) => p.id === planId);

  if (!plan) {
    throw new Error(`Plan with id ${planId} not found`);
  }

  const { buttonText } = getPricingTableContent(plan);

  const isFree = plan.autoEnable || plan.price === null;
  const mainPriceDisplay = isFree
    ? {
        primaryText: "Free",
      }
    : plan.price?.display;

  const featureItems = plan.items;

  return (
    <Card
      className={cn(
        "relative h-full w-full max-w-xl rounded-2xl shadow-sm transition-all",
        isRecommended && "ring-primary shadow-md ring-2 sm:scale-[1.02]",
        className,
      )}
    >
      {isRecommended && (
        <Badge className="hover:bg-primary absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1">
          Recommended
        </Badge>
      )}
      <CardHeader className="pb-4">
        <CardTitle className="truncate text-xl font-bold">
          {plan.name}
        </CardTitle>
        {plan.description && (
          <CardDescription className="min-h-10">
            <p className="line-clamp-2">{plan.description}</p>
          </CardDescription>
        )}
        <div className="mb-2 pt-2">
          <h3 className="flex h-16 items-center">
            <div className="line-clamp-2">
              <span className="text-3xl font-bold tracking-tight">
                {mainPriceDisplay?.primaryText}
              </span>{" "}
              {mainPriceDisplay?.secondaryText && (
                <span className="text-muted-foreground text-base font-normal">
                  {mainPriceDisplay.secondaryText}
                </span>
              )}
            </div>
          </h3>
        </div>
      </CardHeader>
      {showFeatures && featureItems.length > 0 && (
        <CardContent className="mb-8 grow">
          <Separator className="mb-6" />
          <PricingFeatureList items={featureItems} />
        </CardContent>
      )}
      <CardFooter className="mt-auto flex-col items-stretch">
        <PricingCardButton recommended={isRecommended} {...buttonProps}>
          {buttonText}
        </PricingCardButton>
        {disclaimer && (
          <p className="text-muted-foreground mt-2 text-center text-xs">
            {disclaimer}
          </p>
        )}
      </CardFooter>
    </Card>
  );
};

interface PlanItem {
  display?: {
    primaryText?: string;
    secondaryText?: string;
  };
}

export const PricingFeatureList = ({
  items,
  className,
}: {
  items: PlanItem[];
  className?: string;
}) => {
  return (
    <div className={cn("grow", className)}>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-3 text-sm">
            <CheckIcon className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex flex-col">
              <span>{item.display?.primaryText}</span>
              {item.display?.secondaryText && (
                <span className="text-muted-foreground text-xs">
                  {item.display.secondaryText}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Pricing Card Button
export interface PricingCardButtonProps extends Omit<
  React.ComponentProps<"button">,
  "onClick"
> {
  recommended?: boolean;
  buttonUrl?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
}

export const PricingCardButton = React.forwardRef<
  HTMLButtonElement,
  PricingCardButtonProps
>(({ recommended, children, className, onClick, ...props }, ref) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true);
    try {
      await onClick?.(e);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      className={cn(
        "group relative w-full overflow-hidden rounded-lg border px-4 py-3 transition-all duration-300 hover:brightness-90",
        className,
      )}
      {...props}
      variant={recommended ? "default" : "secondary"}
      ref={ref}
      disabled={loading || props.disabled}
      onClick={handleClick}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <div className="flex w-full items-center justify-between transition-transform duration-300 group-hover:translate-y-[-130%]">
            <span>{children}</span>
            <span className="text-sm">→</span>
          </div>
          <div className="absolute mt-2 flex w-full translate-y-[130%] items-center justify-between px-4 transition-transform duration-300 group-hover:mt-0 group-hover:translate-y-0">
            <span>{children}</span>
            <span className="text-sm">→</span>
          </div>
        </>
      )}
    </Button>
  );
});
PricingCardButton.displayName = "PricingCardButton";

// Annual Switch
export const AnnualSwitch = ({
  isAnnualToggle,
  setIsAnnualToggle,
}: {
  isAnnualToggle: boolean;
  setIsAnnualToggle: (isAnnual: boolean) => void;
}) => {
  return (
    <div className="mb-6 flex items-center space-x-2">
      <span className="text-muted-foreground text-sm">Monthly</span>
      <Switch
        id="annual-billing"
        checked={isAnnualToggle}
        onCheckedChange={setIsAnnualToggle}
      />
      <span className="text-muted-foreground text-sm">Annual</span>
    </div>
  );
};

const PricingCardSkeleton = () => {
  return (
    <Card className="h-full w-full max-w-xl rounded-2xl shadow-sm">
      <CardHeader className="pb-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-2 h-4 w-40" />
        <div className="mb-2 pt-2">
          <div className="flex h-16 items-center">
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="mb-8 grow">
        <Separator className="mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-full max-w-[180px]" />
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-11 w-full rounded-lg" />
      </CardFooter>
    </Card>
  );
};

function getPricingTableContent(plan: Plan) {
  const { status, attachAction } = plan.customerEligibility ?? {};
  const hasTrial = plan.freeTrial !== undefined;
  const isOneOff = plan.price?.interval === "one_off";

  if (hasTrial) {
    return { buttonText: <p>Start Free Trial</p> };
  }
  if (status === "scheduled") {
    return { buttonText: <p>Plan Scheduled</p> };
  }
  if (status === "active" && attachAction === "none") {
    return { buttonText: <p>Current Plan</p> };
  }

  switch (attachAction) {
    case "purchase":
    case "activate":
      return { buttonText: <p>{isOneOff ? "Purchase" : "Get started"}</p> };
    case "upgrade":
      return { buttonText: <p>Upgrade</p> };
    case "downgrade":
      return { buttonText: <p>Downgrade</p> };
    default:
      return { buttonText: <p>Get Started</p> };
  }
}
