import type { Metadata } from "next";

export function marketingMetadata({
  title,
  description,
  path,
  markdownPath,
}: {
  title: string;
  description: string;
  path: string;
  markdownPath: string;
}): Metadata {
  return {
    title,
    description,
    robots: "index,follow",
    alternates: {
      canonical: path,
      types: { "text/markdown": markdownPath },
    },
    openGraph: {
      type: "website",
      siteName: "Flatsby",
      url: path,
      title,
      description,
      images: "/opengraph-image",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: "/opengraph-image",
    },
  };
}
