import { notFound } from "next/navigation";

import {
  contentPageMarkdown,
  englishContentPages,
  markdownResponse,
} from "~/app/_components/landing/markdown";
import { contentPageParams } from "~/app/_components/landing/pages";

export const dynamicParams = false;
export const generateStaticParams = contentPageParams;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const slug = (await params).slug.join("/");
  const page = englishContentPages.find((page) => page.slug === slug);
  if (!page) notFound();
  return markdownResponse(contentPageMarkdown(page), `/${page.slug}`);
}
