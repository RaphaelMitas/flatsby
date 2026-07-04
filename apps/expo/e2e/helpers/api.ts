import { fetchWithVercelBypass } from "./vercel";

export function getApiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (url) return url.replace(/\/$/, "");
  return "http://localhost:3000";
}

export async function cleanupStaleE2eData(): Promise<void> {
  const url = `${getApiBaseUrl()}/api/e2e/create-session`;

  try {
    const res = await fetchWithVercelBypass(url, { method: "DELETE" });

    if (!res.ok) {
      console.warn(
        `E2E cleanup failed: ${res.status} ${await res.text().catch(() => "")}`,
      );
    }
  } catch (error) {
    console.warn("E2E cleanup request failed:", error);
  }
}
