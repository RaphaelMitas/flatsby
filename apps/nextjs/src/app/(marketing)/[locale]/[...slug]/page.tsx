import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentPage } from "~/app/_components/landing/ContentPage";
import {
  marketingTranslator,
  routeLocale,
} from "~/app/_components/landing/i18n";
import { marketingMetadata } from "~/app/_components/landing/metadata";
import {
  contentPageParams,
  findContentPage,
} from "~/app/_components/landing/pages";

export const dynamicParams = false;

export const generateStaticParams = contentPageParams;

interface Props {
  params: Promise<{ locale: string; slug: string[] }>;
}

async function pageFor(props: Props) {
  const locale = await routeLocale(props);
  const page = findContentPage(
    marketingTranslator(locale),
    (await props.params).slug,
  );
  return { locale, page };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, page } = await pageFor(props);
  if (!page) return {};
  return marketingMetadata({
    locale,
    title: page.title,
    description: page.description,
    path: `/${page.slug}`,
    markdownPath: `/${page.slug}.md`,
  });
}

export default async function Page(props: Props) {
  const { page } = await pageFor(props);
  if (!page) notFound();
  return <ContentPage page={page} />;
}
