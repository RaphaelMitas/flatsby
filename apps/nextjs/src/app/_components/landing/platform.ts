import { headers } from "next/headers";

export type Platform = "ios" | "android" | "other";

export async function getPlatform(): Promise<Platform> {
  const ua = (await headers()).get("user-agent") ?? "";
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}
