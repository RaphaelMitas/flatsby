import Link from "next/link";

import type { FaqItem } from "./content";

export function FaqSection({
  items,
  showAllLink = false,
}: {
  items: readonly FaqItem[];
  showAllLink?: boolean;
}) {
  return (
    <section id="faq" className="bg-muted/50 px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl">
          Questions
        </h2>
        {items.map((item) => (
          <details key={item.question} className="border-b py-4">
            <summary className="cursor-pointer font-medium">
              {item.question}
            </summary>
            <p className="text-muted-foreground mt-2">{item.answer}</p>
          </details>
        ))}
        {showAllLink && (
          <p className="mt-6 text-center">
            <Link href="/faq" className="font-medium underline">
              All questions
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
