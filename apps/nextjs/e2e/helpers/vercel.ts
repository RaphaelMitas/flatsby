export function parseVercelJwt(setCookieHeader: string): string | null {
  const jwtMatch = /_vercel_jwt=([^;]+)/.exec(setCookieHeader);
  return jwtMatch?.[1] ?? null;
}

export function getVercelBypassSecret(): string | undefined {
  return process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
}

export function getVercelBypassHeaders(
  setBypassCookie: "true" | "samesitenone" = "true",
): Record<string, string> {
  const bypassSecret = getVercelBypassSecret();
  if (!bypassSecret) return {};
  return {
    "x-vercel-protection-bypass": bypassSecret,
    "x-vercel-set-bypass-cookie": setBypassCookie,
  };
}

/**
 * Fetches a Vercel-protected URL, handling the 307 redirect that sets
 * _vercel_jwt. Node's fetch follows 307 poorly and may redirect infinitely.
 */
export async function fetchWithVercelBypass(
  url: string,
  init: RequestInit & { setBypassCookie?: "true" | "samesitenone" } = {},
): Promise<Response> {
  const { setBypassCookie = "true", ...fetchInit } = init;
  const headers = {
    ...(fetchInit.headers as Record<string, string> | undefined),
    ...getVercelBypassHeaders(setBypassCookie),
  };

  let res = await fetch(url, { ...fetchInit, headers, redirect: "manual" });

  if (res.status >= 300 && res.status < 400) {
    const setCookie = res.headers.get("set-cookie") ?? "";
    const jwt = parseVercelJwt(setCookie);
    if (jwt) {
      res = await fetch(url, {
        ...fetchInit,
        headers: { ...headers, cookie: `_vercel_jwt=${jwt}` },
        redirect: "manual",
      });
    }
  }

  return res;
}
