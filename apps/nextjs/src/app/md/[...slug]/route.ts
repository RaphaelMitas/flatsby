import { notFound } from "next/navigation";

import { contentPageMarkdown } from "~/app/_components/landing/markdown";
import {
  CONTENT_PAGES,
  findContentPage,
} from "~/app/_components/landing/pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return CONTENT_PAGES.map((page) => ({ slug: page.slug.split("/") }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const page = findContentPage((await params).slug.join("/"));
  if (!page) notFound();
  return new Response(contentPageMarkdown(page), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
