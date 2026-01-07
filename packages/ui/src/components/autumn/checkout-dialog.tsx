"use client";

import type { CheckoutParams, CheckoutResult, ProductItem } from "autumn-js";
import type React from "react";
import { useEffect, useState } from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { UsageModel } from "autumn-js";
import { useCustomer } from "autumn-js/react";
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react";

import { cn } from "@flatsby/ui";

import { Accordion, AccordionContent, AccordionItem } from "../../accordion";
import { Button, ButtonProps } from "../../button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "../../dialog";
import { Input } from "../../input";
import { getCheckoutContent } from "../../lib/autumn/checkout-content";
import { Popover, PopoverContent, PopoverTrigger } from "../../popover";

export interface CheckoutDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  checkoutResult: CheckoutResult;
  checkoutParams?: CheckoutParams;
}

const formatCurrency = ({
  amount,
  currency,
}: {
  amount: number;
  currency: string;
}) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

export default function CheckoutDialog(params: CheckoutDialogProps) {
  const { attach } = useCustomer();
  const [checkoutResult, setCheckoutResult] = useState<
    CheckoutResult | undefined
  >(params.checkoutResult);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (params.checkoutResult) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCheckoutResult(params.checkoutResult);
    }
  }, [params.checkoutResult]);

  const [loading, setLoading] = useState(false);

  if (!checkoutResult) {
    return <></>;
  }

  const { open, setOpen } = params;
  const { title, message } = getCheckoutContent(checkoutResult);

  const isFree = checkoutResult.product.properties.is_free;
  const isPaid = isFree === false;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="text-foreground gap-0 p-0 pt-4 text-sm">
        <DialogTitle className="mb-1 px-6">{title}</DialogTitle>
        <div className="text-muted-foreground mt-1 mb-4 px-6">{message}</div>

        {isPaid && (
          <PriceInformation
            checkoutResult={checkoutResult}
            setCheckoutResult={setCheckoutResult}
          />
        )}

        <DialogFooter className="bg-secondary flex flex-col justify-between gap-x-4 border-t py-2 pr-3 pl-6 shadow-inner sm:flex-row">
          <Button
            size="sm"
            onClick={async () => {
              setLoading(true);

              const options = checkoutResult.options.map((option) => {
                return {
                  featureId: option.feature_id,
                  quantity: option.quantity,
                };
              });

              await attach({
                productId: checkoutResult.product.id,
                ...(params.checkoutParams ?? {}),
                options,
              });
              setOpen(false);
              setLoading(false);
            }}
            disabled={loading}
            className="flex min-w-16 items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span className="flex gap-1 whitespace-nowrap">Confirm</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PriceInformation({
  checkoutResult,
  setCheckoutResult,
}: {
  checkoutResult: CheckoutResult;
  setCheckoutResult: (checkoutResult: CheckoutResult) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-4 px-6">
      <ProductItems
        checkoutResult={checkoutResult}
        setCheckoutResult={setCheckoutResult}
      />

      <div className="flex flex-col gap-2">
        {checkoutResult.has_prorations && checkoutResult.lines.length > 0 && (
          <CheckoutLines checkoutResult={checkoutResult} />
        )}
        <DueAmounts checkoutResult={checkoutResult} />
      </div>
    </div>
  );
}

function DueAmounts({ checkoutResult }: { checkoutResult: CheckoutResult }) {
  const { next_cycle, product } = checkoutResult;
  const nextCycleAtStr = next_cycle
    ? new Date(next_cycle.starts_at).toLocaleDateString()
    : undefined;

  const hasUsagePrice = product.items.some(
    (item) => item.usage_model === UsageModel.PayPerUse,
  );

  const showNextCycle = next_cycle && next_cycle.total !== checkoutResult.total;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <div>
          <p className="text-md font-medium">Total due today</p>
        </div>

        <p className="text-md font-medium">
          {formatCurrency({
            amount: checkoutResult.total,
            currency: checkoutResult.currency,
          })}
        </p>
      </div>
      {showNextCycle && (
        <div className="text-muted-foreground flex justify-between">
          <div>
            <p className="text-md">Due next cycle ({nextCycleAtStr})</p>
          </div>
          <p className="text-md">
            {formatCurrency({
              amount: next_cycle.total,
              currency: checkoutResult.currency,
            })}
            {hasUsagePrice && <span> + usage prices</span>}
          </p>
        </div>
      )}
    </div>
  );
}

function ProductItems({
  checkoutResult,
  setCheckoutResult,
}: {
  checkoutResult: CheckoutResult;
  setCheckoutResult: (checkoutResult: CheckoutResult) => void;
}) {
  const isUpdateQuantity =
    checkoutResult.product.scenario === "active" &&
    checkoutResult.product.properties.updateable;

  const isOneOff = checkoutResult.product.properties.is_one_off;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Price</p>
      {checkoutResult.product.items
        .filter((item) => item.type !== "feature")
        .map((item, index) => {
          if (item.usage_model == UsageModel.Prepaid) {
            return (
              <PrepaidItem
                key={index}
                item={item}
                checkoutResult={checkoutResult}
                setCheckoutResult={setCheckoutResult}
              />
            );
          }

          if (isUpdateQuantity) {
            return null;
          }

          return (
            <div key={index} className="flex justify-between">
              <p className="text-muted-foreground">
                {item.feature
                  ? item.feature.name
                  : isOneOff
                    ? "Price"
                    : "Subscription"}
              </p>
              <p>
                {item.display?.primary_text} {item.display?.secondary_text}
              </p>
            </div>
          );
        })}
    </div>
  );
}

function CheckoutLines({ checkoutResult }: { checkoutResult: CheckoutResult }) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="total" className="border-b-0">
        <CustomAccordionTrigger className="my-0 w-full justify-between border-none py-0">
          <div className="flex w-full cursor-pointer items-center justify-end gap-1">
            <p className="text-muted-foreground font-light">View details</p>
            <ChevronDown
              className="text-muted-foreground mt-0.5 rotate-90 transition-transform duration-200 ease-in-out"
              size={14}
            />
          </div>
        </CustomAccordionTrigger>
        <AccordionContent className="mt-2 mb-0 flex flex-col gap-2 pb-2">
          {checkoutResult.lines
            .filter((line) => line.amount !== 0)
            .map((line, index) => {
              return (
                <div key={index} className="flex justify-between">
                  <p className="text-muted-foreground">{line.description}</p>
                  <p className="text-muted-foreground">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: checkoutResult.currency,
                    }).format(line.amount)}
                  </p>
                </div>
              );
            })}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function CustomAccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]_svg]:rotate-0",
          className,
        )}
        {...props}
      >
        {children}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

const PrepaidItem = ({
  item,
  checkoutResult,
  setCheckoutResult,
}: {
  item: ProductItem;
  checkoutResult: CheckoutResult;
  setCheckoutResult: (checkoutResult: CheckoutResult) => void;
}) => {
  const { quantity = 0, billing_units: billingUnits = 1 } = item;
  const [quantityInput, setQuantityInput] = useState<string>(
    (quantity / billingUnits).toString(),
  );
  const { checkout } = useCustomer();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const scenario = checkoutResult.product.scenario;

  const handleSave = async () => {
    setLoading(true);
    try {
      const newOptions = checkoutResult.options
        .filter((option) => option.feature_id !== item.feature_id)
        .map((option) => {
          return {
            featureId: option.feature_id,
            quantity: option.quantity,
          };
        });

      if (item.feature_id) {
        newOptions.push({
          featureId: item.feature_id,
          quantity: Number(quantityInput) * billingUnits,
        });
      }

      const { data, error } = await checkout({
        productId: checkoutResult.product.id,
        options: newOptions,
        dialog: CheckoutDialog,
      });

      if (error) {
        console.error(error);
        return;
      }
      setCheckoutResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const disableSelection = scenario === "renew";

  return (
    <div className="flex justify-between gap-2">
      <div className="flex items-start gap-2">
        <p className="text-muted-foreground whitespace-nowrap">
          {item.feature?.name}
        </p>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            className={cn(
              "text-muted-foreground bg-accent/80 flex shrink-0 items-center gap-1 rounded-md px-1 py-0.5 text-xs",
              disableSelection !== true &&
                "hover:bg-accent hover:text-foreground",
              disableSelection &&
                "pointer-events-none cursor-not-allowed opacity-80",
            )}
            disabled={disableSelection}
          >
            Qty: {quantity}
            {!disableSelection && <ChevronDown size={12} />}
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="flex w-80 flex-col gap-4 p-4 pt-3 text-sm"
          >
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{item.feature?.name}</p>
              <p className="text-muted-foreground">
                {item.display?.primary_text} {item.display?.secondary_text}
              </p>
            </div>

            <div className="flex items-end justify-between">
              <div className="flex items-center gap-2">
                <Input
                  className="h-7 w-16 focus:!ring-2"
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                />
                <p className="text-muted-foreground">
                  {billingUnits > 1 && `x ${billingUnits} `}
                  {item.feature?.name}
                </p>
              </div>

              <Button
                onClick={handleSave}
                className="text-foreground !h-7 w-14 items-center border border-zinc-200 bg-white text-sm shadow-sm hover:bg-zinc-100"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="text-muted-foreground !h-4 !w-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-end">
        {item.display?.primary_text} {item.display?.secondary_text}
      </p>
    </div>
  );
};

export const PriceItem = ({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-1 pb-4 sm:h-7 sm:flex-row sm:items-center sm:gap-2 sm:pb-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const PricingDialogButton = ({
  children,
  size,
  onClick,
  disabled,
  className,
}: Pick<
  ButtonProps,
  "children" | "size" | "onClick" | "disabled" | "className"
>) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      size={size}
      className={cn(className, "shadow-sm shadow-stone-400")}
    >
      {children}
      <ArrowRight className="!h-3" />
    </Button>
  );
};
