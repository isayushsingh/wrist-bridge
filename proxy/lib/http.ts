/**
 * The only way the proxy talks to a PWA.
 * Guarantees: same-origin only (no SSRF), timeout, response-size cap, JSON only.
 */
import { forbidden, upstream } from "./errors";
import type { ResolvedApp } from "./registry";

export const FETCH_TIMEOUT_MS = 8000;
export const MAX_RESPONSE_BYTES = 1_000_000;

/** Resolve `pathOrUrl` against the app origin and refuse anything that leaves it. */
export function resolveSameOrigin(app: ResolvedApp, pathOrUrl: string): URL {
  let url: URL;
  try {
    url = new URL(pathOrUrl, app.origin);
  } catch {
    throw forbidden(`Invalid URL "${pathOrUrl}"`);
  }
  if (url.origin !== app.origin) {
    throw forbidden(`URL "${url.href}" is outside the registered origin ${app.origin}`);
  }
  return url;
}

export type FetchInit = { method?: string; body?: unknown };

export type FetchResult = { status: number; ok: boolean; json: unknown };

export async function fetchAppJSON(app: ResolvedApp, pathOrUrl: string, init: FetchInit = {}): Promise<FetchResult> {
  const url = resolveSameOrigin(app, pathOrUrl);
  const headers: Record<string, string> = {
    accept: "application/json, application/manifest+json;q=0.9",
    "user-agent": "WristBridge-Proxy/0.1",
  };
  const token = app.authTokenEnv ? process.env[app.authTokenEnv] : undefined;
  if (token) headers.authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers["content-type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "manual", // a redirect could point off-origin; treat it as an error
      cache: "no-store",
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === "TimeoutError" ? "timed out" : "is unreachable";
    throw upstream(`${app.id} ${reason}`, 504);
  }

  const text = await res.text();
  if (text.length > MAX_RESPONSE_BYTES) throw upstream(`${app.id} response too large`);

  let json: unknown = null;
  if (text.trim()) {
    try {
      json = JSON.parse(text);
    } catch {
      if (res.ok) throw upstream(`${app.id} returned non-JSON from ${url.pathname}`);
    }
  }
  return { status: res.status, ok: res.ok, json };
}

/** Like fetchAppJSON but throws unless the response is 2xx. */
export async function getAppJSON(app: ResolvedApp, pathOrUrl: string, init: FetchInit = {}): Promise<unknown> {
  const res = await fetchAppJSON(app, pathOrUrl, init);
  if (!res.ok) throw upstream(`${app.id} answered ${res.status} for ${pathOrUrl}`, res.status === 404 ? 404 : 502);
  return res.json;
}
