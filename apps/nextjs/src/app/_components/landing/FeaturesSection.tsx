import { Bot, ShoppingCart, Users, Wallet } from "lucide-react";

import { Avatar, AvatarFallback } from "@flatsby/ui/avatar";

import { ChatDemo } from "./ChatDemo";
import { ExpenseDemo } from "./ExpenseDemo";
import { ShoppingListDemo } from "./ShoppingListDemo";

export function FeaturesSection() {
  return (
    <section id="features" className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
          Everything you need to run your household
        </h2>

        <div className="flex flex-col gap-16 md:gap-24">
          {/* Feature 1: Shopping Lists */}
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
            <div className="order-2 md:order-1">
              <div className="text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-2xl font-semibold">
                Shared Shopping Lists
              </h3>
              <p className="text-muted-foreground">
                Create shopping lists that everyone in your household can view
                and update in real-time. Never buy duplicates or forget items
                again.
              </p>
            </div>
            <div className="order-1 md:order-2">
              <ShoppingListDemo />
            </div>
          </div>

          {/* Feature 2: Expense Tracking */}
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
            <div className="order-1">
              <ExpenseDemo />
            </div>
            <div className="order-2">
              <div className="text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Wallet className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-2xl font-semibold">Expense Splitting</h3>
              <p className="text-muted-foreground">
                Track shared expenses and split them fairly between flatmates.
                See who owes what and settle up with ease.
              </p>
            </div>
          </div>

          {/* Feature 3: AI Assistant */}
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
            <div className="order-2 md:order-1">
              <div className="text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-2xl font-semibold">AI Assistant</h3>
              <p className="text-muted-foreground">
                Chat with your household assistant to quickly add items, track
                expenses, or get help organizing your home. Just tell it what
                you need.
              </p>
            </div>
            <div className="order-1 md:order-2">
              <ChatDemo />
            </div>
          </div>

          {/* Feature 4: Household Groups */}
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="mb-3 text-2xl font-semibold">Household Groups</h3>
            <p className="text-muted-foreground mb-6">
              Create your household group and invite your flatmates with a
              simple link. Everyone stays in sync, whether you have 2 or 10
              roommates.
            </p>
            <div className="flex justify-center">
              <div className="flex -space-x-3">
                <Avatar className="border-background h-10 w-10 border-2">
                  <AvatarFallback>AL</AvatarFallback>
                </Avatar>
                <Avatar className="border-background h-10 w-10 border-2">
                  <AvatarFallback>SA</AvatarFallback>
                </Avatar>
                <Avatar className="border-background h-10 w-10 border-2">
                  <AvatarFallback>JO</AvatarFallback>
                </Avatar>
                <Avatar className="border-background h-10 w-10 border-2">
                  <AvatarFallback>+2</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
