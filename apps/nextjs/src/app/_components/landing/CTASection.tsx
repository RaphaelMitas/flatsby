import Link from "next/link";

import { Button } from "@flatsby/ui/button";

import { CTA_NOTE } from "./content";

export function CTASection() {
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">
          Ready to simplify your household?
        </h2>
        <p className="text-muted-foreground mb-8 text-lg">{CTA_NOTE}</p>
        <Button size="lg" asChild>
          <Link href="/auth/login">Get Started Free</Link>
        </Button>
      </div>
    </section>
  );
}
