import React, { createContext, useContext, useState } from "react";
import { useCustomer, useListPlans } from "autumn-js/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@flatsby/ui";
import { PLAN_IDS } from "@flatsby/validators/billing";

import { Button } from "../../button";
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
      <div className="flex h-full min-h-[300px] w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return <div> Something went wrong...</div>;
  }

  const currentPlanId = customer?.subscriptions[0]?.planId;
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
            const scenario = plan.customerEligibility?.scenario;
            return (
              <PricingCard
                key={index}
                planId={plan.id}
                disclaimer={
                  isApplePlan
                    ? "To cancel, go to App Store subscriptions"
                    : undefined
                }
                buttonProps={{
                  disabled:
                    isApplePlan ||
                    scenario === "active" ||
                    scenario === "scheduled",

                  onClick: async () => {
                    if (!plan.id || !customer) return;

                    const pendingCancelSub = customer.subscriptions.find(
                      (s) => s.canceledAt !== null,
                    );

                    try {
                      if (pendingCancelSub && scenario === "renew") {
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
            "grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]",
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
    : plan.items[0]?.display;

  const featureItems = isFree ? plan.items : plan.items.slice(1);

  return (
    <div
      className={cn(
        "text-foreground h-full w-full max-w-xl rounded-lg border py-6 shadow-sm",
        className,
      )}
    >
      <div className={cn("flex h-full flex-grow flex-col")}>
        <div className="h-full">
          <div className="flex flex-col">
            <div className="pb-4">
              <h2 className="truncate px-6 text-2xl font-semibold">
                {plan.name}
              </h2>
              {plan.description && (
                <div className="text-muted-foreground h-8 px-6 text-sm">
                  <p className="line-clamp-2">{plan.description}</p>
                </div>
              )}
            </div>
            <div className="mb-2">
              <h3 className="bg-secondary/40 mb-4 flex h-16 items-center border-y px-6 font-semibold">
                <div className="line-clamp-2">
                  {mainPriceDisplay?.primaryText}{" "}
                  {mainPriceDisplay?.secondaryText && (
                    <span className="text-muted-foreground mt-1 font-normal">
                      {mainPriceDisplay.secondaryText}
                    </span>
                  )}
                </div>
              </h3>
            </div>
          </div>
          {showFeatures && featureItems.length > 0 && (
            <div className="mb-6 flex-grow px-6">
              <PricingFeatureList items={featureItems} />
            </div>
          )}
        </div>
        <div className={cn("px-6")}>
          <PricingCardButton {...buttonProps}>{buttonText}</PricingCardButton>
          {disclaimer && (
            <p className="text-muted-foreground mt-2 text-center text-xs">
              {disclaimer}
            </p>
          )}
        </div>
      </div>
    </div>
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
    <div className={cn("flex-grow", className)}>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2 text-sm">
            <div className="flex flex-col">
              <span>{item.display?.primaryText}</span>
              {item.display?.secondaryText && (
                <span className="text-muted-foreground text-sm">
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
      variant={recommended ? "primary" : "secondary"}
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
    <div className="mb-4 flex items-center space-x-2">
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

export const RecommendedBadge = ({ recommended }: { recommended: string }) => {
  return (
    <div className="bg-secondary text-muted-foreground absolute top-[-1px] right-[-1px] rounded-bl-lg border px-3 text-sm font-medium lg:top-4 lg:right-4 lg:rounded-full lg:py-0.5">
      {recommended}
    </div>
  );
};

function getPricingTableContent(plan: Plan) {
  const scenario = plan.customerEligibility?.scenario;
  const hasTrial = plan.freeTrial !== undefined;
  const isOneOff = plan.price?.interval === "one_off";

  if (hasTrial) {
    return { buttonText: <p>Start Free Trial</p> };
  }

  switch (scenario) {
    case "scheduled":
      return { buttonText: <p>Plan Scheduled</p> };
    case "active":
      return { buttonText: <p>Current Plan</p> };
    case "new":
      return {
        buttonText: <p>{isOneOff ? "Purchase" : "Get started"}</p>,
      };
    case "renew":
      return { buttonText: <p>Renew</p> };
    case "upgrade":
      return { buttonText: <p>Upgrade</p> };
    case "downgrade":
      return { buttonText: <p>Downgrade</p> };
    case "cancel":
      return { buttonText: <p>Cancel Plan</p> };
    default:
      return { buttonText: <p>Get Started</p> };
  }
}
