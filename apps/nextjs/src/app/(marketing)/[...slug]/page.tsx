import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentPage } from "~/app/_components/landing/ContentPage";
import {
  CONTENT_PAGES,
  findContentPage,
} from "~/app/_components/landing/pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return CONTENT_PAGES.map((page) => ({ slug: page.slug.split("/") }));
}

interface Props {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = findContentPage((await params).slug.join("/"));
  if (!page) return {};
  const path = `/${page.slug}`;
  return {
    title: page.title,
    description: page.description,
    robots: "index,follow",
    alternates: {
      canonical: path,
      types: { "text/markdown": `${path}.md` },
    },
    openGraph: {
      type: "website",
      siteName: "Flatsby",
      url: path,
      title: page.title,
      description: page.description,
      images: "/opengraph-image",
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: "/opengraph-image",
    },
  };
}

export default async function Page({ params }: Props) {
  const page = findContentPage((await params).slug.join("/"));
  if (!page) notFound();
  return <ContentPage page={page} />;
}
