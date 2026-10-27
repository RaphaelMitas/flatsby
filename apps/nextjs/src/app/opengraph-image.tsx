import { ImageResponse } from "next/og";

import {
  ogImageSize,
  SiteOgCard,
  siteOgCardAlt,
} from "./_components/landing/SiteOgCard";

export const alt = siteOgCardAlt;
export const size = ogImageSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<SiteOgCard />, size);
}
