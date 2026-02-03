import { ListChecks, Share2, UserPlus } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@flatsby/ui/card";

const steps = [
  {
    icon: UserPlus,
    title: "Create your household",
    description: "Sign up and create a group for your home in seconds.",
  },
  {
    icon: Share2,
    title: "Invite flatmates",
    description: "Share a link with your roommates to join your household.",
  },
  {
    icon: ListChecks,
    title: "Start organizing",
    description: "Add shopping lists, track expenses, and stay in sync.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-muted/50 px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
          Get started in 3 simple steps
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="relative">
              <CardHeader>
                <div className="bg-primary text-primary-foreground absolute -top-3 left-4 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold">
                  {index + 1}
                </div>
                <div className="text-primary bg-primary/10 mb-2 flex h-10 w-10 items-center justify-center rounded-lg">
                  <step.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
