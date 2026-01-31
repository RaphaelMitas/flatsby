import Link from "next/link";

import { Button } from "@flatsby/ui/button";

export function CTASection() {
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">
          Ready to simplify your household?
        </h2>
        <p className="text-muted-foreground mb-8 text-lg">
          Join thousands of households already using Flatsby to stay organized.
        </p>
        <Link href="/auth/login">
          <Button size="lg">Get Started Free</Button>
        </Link>
      </div>
    </section>
  );
}
