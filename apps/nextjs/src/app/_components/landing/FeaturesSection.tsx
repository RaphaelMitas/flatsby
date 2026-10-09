import { Bot, ShoppingCart, Users, Wallet } from "lucide-react";

import { Avatar, AvatarFallback } from "@flatsby/ui/avatar";

import { ChatDemo } from "./ChatDemo";
import { FEATURES } from "./content";
import { ExpenseDemo } from "./ExpenseDemo";
import { ShoppingListDemo } from "./ShoppingListDemo";

export function FeaturesSection() {
  const [lists, expenses, assistant, groups] = FEATURES;

  return (
    <section id="features" className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">
          Everything you need to run your household
        </h2>
        <p className="text-muted-foreground mb-12 text-center text-sm">
          The lists, expenses and chat below are examples.
        </p>

        <div className="flex flex-col gap-16 md:gap-24">
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
            <div className="order-2 md:order-1">
              <div className="text-primary bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-2xl font-semibold">{lists.title}</h3>
              <p className="text-muted-foreground">{lists.body}</p>
            </div>
            <div className="order-1 md:order-2">
              <ShoppingListDemo />
            </div>
          </div>
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
            <div className="order-1">
              <ExpenseDemo />
            </div>
            <div className="order-2">
              <div className="text-primary bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Wallet className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-2xl font-semibold">{expenses.title}</h3>
              <p className="text-muted-foreground">{expenses.body}</p>
            </div>
          </div>
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
            <div className="order-2 md:order-1">
              <div className="text-primary bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-2xl font-semibold">{assistant.title}</h3>
              <p className="text-muted-foreground">{assistant.body}</p>
            </div>
            <div className="order-1 md:order-2">
              <ChatDemo />
            </div>
          </div>
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-primary bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="mb-3 text-2xl font-semibold">{groups.title}</h3>
            <p className="text-muted-foreground mb-6">{groups.body}</p>
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
