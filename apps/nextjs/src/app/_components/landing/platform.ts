export const platforms = ["ios", "android", "other"] as const;

export type Platform = (typeof platforms)[number];

export function isPlatform(value: string): value is Platform {
  return platforms.some((platform) => platform === value);
}

export function platformFor(userAgent: string | null): Platform {
  const ua = userAgent ?? "";
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}
