import Link from "next/link";

import { Badge } from "@flatsby/ui/badge";
import { Button } from "@flatsby/ui/button";

export function HeroSection() {
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <Badge variant="secondary" className="mb-4">
          Free for all
        </Badge>
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          Household management, simplified.
        </h1>
        <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg md:text-xl">
          Share shopping lists, split expenses, and stay organized with your
          flatmates.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/auth/login">
            <Button size="lg" className="w-full sm:w-auto">
              Get Started Free
            </Button>
          </Link>
          <a href="#features">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              See Features
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
