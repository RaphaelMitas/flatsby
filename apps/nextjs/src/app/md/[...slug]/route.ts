import { notFound } from "next/navigation";

import {
  contentPageMarkdown,
  markdownResponse,
} from "~/app/_components/landing/markdown";
import {
  contentPageParams,
  findContentPage,
} from "~/app/_components/landing/pages";

export const dynamicParams = false;
export const generateStaticParams = contentPageParams;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const page = findContentPage((await params).slug.join("/"));
  if (!page) notFound();
  return markdownResponse(contentPageMarkdown(page));
}
