import Link from "next/link";

import { Button } from "@flatsby/ui/button";

import type { ContentPageData } from "./pages";
import { UPDATED } from "./content";
import { FaqSection } from "./FaqSection";
import { CONTENT_PAGES } from "./pages";
import { ScreenshotImage } from "./ScreenshotImage";
import { SiteShell } from "./SiteShell";
import { contentPageJsonLd, JsonLd } from "./structured-data";

export function ContentPage({ page }: { page: ContentPageData }) {
  return (
    <SiteShell>
      <JsonLd graph={contentPageJsonLd(page)} />
      <article className="mx-auto flex max-w-3xl flex-col gap-12 px-4 py-16">
        <header className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            {page.headline}
          </h1>
          <p className="text-muted-foreground text-lg">{page.intro}</p>
          <p className="text-muted-foreground text-sm">
            Updated <time dateTime={UPDATED}>{UPDATED}</time>
          </p>
        </header>

        {page.table && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="text-muted-foreground mb-2 caption-bottom pt-2 text-xs">
                {page.table.caption}
              </caption>
              <thead>
                <tr className="border-b">
                  {page.table.head.map((cell) => (
                    <th key={cell} scope="col" className="py-2 pr-4">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.table.rows.map(([label, ...cells]) => (
                  <tr key={label} className="border-b">
                    <th scope="row" className="py-2 pr-4 font-medium">
                      {label}
                    </th>
                    {cells.map((cell, i) => (
                      <td
                        key={page.table?.head[i + 1]}
                        className="text-muted-foreground py-2 pr-4"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {page.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold md:text-3xl">
              {section.heading}
            </h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="text-muted-foreground">
                {paragraph}
              </p>
            ))}
            {section.bullets && (
              <ul className="text-muted-foreground list-disc pl-6">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
            {section.image && <ScreenshotImage shot={section.image} />}
          </section>
        ))}

        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/auth/login">Get Started Free</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/">How Flatsby works</Link>
          </Button>
        </div>
        <nav className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">More about Flatsby</h2>
          {CONTENT_PAGES.filter((other) => other.slug !== page.slug).map(
            (other) => (
              <Link
                key={other.slug}
                href={`/${other.slug}`}
                className="text-muted-foreground hover:text-foreground underline"
              >
                {other.headline}
              </Link>
            ),
          )}
        </nav>
      </article>
      {page.faq && <FaqSection items={page.faq} />}
    </SiteShell>
  );
}
