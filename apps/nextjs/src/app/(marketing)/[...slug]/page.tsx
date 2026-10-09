import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentPage } from "~/app/_components/landing/ContentPage";
import { marketingMetadata } from "~/app/_components/landing/metadata";
import {
  contentPageParams,
  findContentPage,
} from "~/app/_components/landing/pages";

export const dynamicParams = false;

export const generateStaticParams = contentPageParams;

interface Props {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = findContentPage((await params).slug);
  if (!page) return {};
  return marketingMetadata({
    title: page.title,
    description: page.description,
    path: `/${page.slug}`,
    markdownPath: `/${page.slug}.md`,
  });
}

export default async function Page({ params }: Props) {
  const page = findContentPage((await params).slug);
  if (!page) notFound();
  return <ContentPage page={page} />;
}
