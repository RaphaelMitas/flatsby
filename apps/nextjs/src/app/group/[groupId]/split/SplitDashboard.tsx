"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { Button } from "@flatsby/ui/button";
import { Card, CardDescription, CardTitle } from "@flatsby/ui/card";
import { ScrollArea } from "@flatsby/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@flatsby/ui/sheet";

import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";
import { SplitCreateExpenseForm } from "./SplitCreateExpenseForm";

export const SplitDashboard = ({ groupId }: { groupId: number }) => {
  const trpc = useTRPC();
  const { data: res } = useSuspenseQuery(
    trpc.split.getExpenses.queryOptions({ groupId }),
  );

  if (!res.success) {
    return handleApiError(res.error);
  }

  const { group } = res.data;

  return (
    <div className="flex h-screen w-full max-w-prose flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Split</h1>
        <p className="text-sm text-muted-foreground">
          Manage shared expenses for group {groupId}
        </p>
      </div>

      <div className="flex gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button className="bottom-5 right-5 sm:absolute md:static">
              Add expense
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Add expense</SheetTitle>
            </SheetHeader>
            <ScrollArea className="mt-4 h-[calc(80vh-6rem)]">
              <SplitCreateExpenseForm group={group} />
            </ScrollArea>
          </SheetContent>
        </Sheet>
        <Button variant="outline" disabled className="opacity-50">
          Settle up
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <CardDescription>You owe</CardDescription>
          <div className="mt-2 text-2xl font-medium">—</div>
        </Card>
        <Card className="p-4">
          <CardDescription>You are owed</CardDescription>
          <div className="mt-2 text-2xl font-medium">—</div>
        </Card>
        <Card className="p-4">
          <CardDescription>Net balance</CardDescription>
          <div className="mt-2 text-2xl font-medium">—</div>
        </Card>
      </section>

      <Card className="p-8 text-center">
        <CardTitle>No expenses yet</CardTitle>
        <CardDescription>
          Create your first expense to start splitting costs.
        </CardDescription>
      </Card>
    </div>
  );
};
