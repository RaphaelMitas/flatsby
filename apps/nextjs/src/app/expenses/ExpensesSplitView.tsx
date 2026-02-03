"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { useMediaQuery } from "@flatsby/ui/hooks/use-media-query";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@flatsby/ui/resizable";

import { ExpenseDetailPanel } from "./ExpenseDetailPanel";
import { ExpenseListPanel } from "./ExpenseListPanel";
import { useExpenseSelection } from "./useExpenseSelection";

export function ExpensesSplitView() {
  const {
    selectedExpenseId,
    action,
    selectExpense,
    editExpense,
    createExpense,
    clearSelection,
  } = useExpenseSelection();

  const router = useRouter();
  const isLargeScreen = useMediaQuery("lg");
  const hasSelection = selectedExpenseId !== null || action === "create";

  if (!isLargeScreen) {
    return (
      <div className="flex h-full min-h-0 flex-1">
        {!hasSelection ? (
          <div className="flex h-full w-full flex-col">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <LoadingSpinner />
                </div>
              }
            >
              <ExpenseListPanel
                selectedExpenseId={selectedExpenseId}
                onSelectExpense={selectExpense}
                onCreateExpense={createExpense}
              />
            </Suspense>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <LoadingSpinner />
                </div>
              }
            >
              {/* Mobile back button */}
              <div className="border-b p-2 lg:hidden">
                <Button variant="ghost" onClick={() => router.back()}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
              <div className="min-h-0 flex-1">
                <ExpenseDetailPanel
                selectedExpenseId={selectedExpenseId}
                action={action}
                onBack={clearSelection}
                onSelectExpense={selectExpense}
                onEditExpense={editExpense}
              />
              </div>
            </Suspense>
          </div>
        )}
      </div>
    );
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full flex-1">
      <ResizablePanel defaultSize={50} minSize={25}>
        <div className="flex h-full w-full flex-col border-r">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <LoadingSpinner />
              </div>
            }
          >
            <ExpenseListPanel
              selectedExpenseId={selectedExpenseId}
              onSelectExpense={selectExpense}
              onCreateExpense={createExpense}
            />
          </Suspense>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={50} minSize={25}>
        <div className="flex h-full w-full flex-col">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <LoadingSpinner />
              </div>
            }
          >
            <ExpenseDetailPanel
              selectedExpenseId={selectedExpenseId}
              action={action}
              onBack={clearSelection}
              onSelectExpense={selectExpense}
              onEditExpense={editExpense}
            />
          </Suspense>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
