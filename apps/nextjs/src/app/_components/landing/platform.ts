export const platforms = ["ios", "android", "other"] as const;

export type Platform = (typeof platforms)[number];

export function isPlatform(value: string): value is Platform {
  return platforms.some((platform) => platform === value);
}

export function platformFor(headers: Headers): Platform {
  return platformForUserAgent(headers.get("user-agent") ?? "");
}

export function platformForUserAgent(ua: string): Platform {
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}
