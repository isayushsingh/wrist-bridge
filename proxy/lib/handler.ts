/** Shared plumbing for every /api/v1 route: auth, errors, ETags, debug warnings. */
import { createHash, timingSafeEqual } from "node:crypto";
import { BridgeError, unauthorized } from "./errors";

export type RouteContext = {
  req: Request;
  url: URL;
  origin: string;
  debug: boolean;
  warnings: string[];
};

function keyMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Auth is on whenever BRIDGE_API_KEY is set. Leave it empty only for local dev. */
export function checkAuth(req: Request): void {
  const expected = process.env.BRIDGE_API_KEY;
  if (!expected) return;
  if (!keyMatches(req.headers.get("x-bridge-key"), expected)) throw unauthorized();
}

export function etagFor(body: string): string {
  return `"${createHash("sha1").update(body).digest("base64url")}"`;
}

type JsonOptions = { status?: number; maxAge?: number; req?: Request };

/** JSON response with an ETag; answers 304 when the watch already has this exact body. */
export function json(data: unknown, { status = 200, maxAge = 0, req }: JsonOptions = {}): Response {
  const body = JSON.stringify(data);
  const etag = etagFor(body);
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    etag,
    "cache-control": maxAge > 0 ? `private, max-age=${maxAge}` : "no-store",
    vary: "x-bridge-key",
  });
  if (status === 200 && req?.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { status, headers });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof BridgeError) {
    return json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
  console.error("[wristbridge] unexpected error", err);
  return json({ error: { code: "internal", message: "Something went wrong in the proxy" } }, { status: 500 });
}

/** Wrap a route: runs auth, builds context, converts thrown errors into JSON. */
export function bridgeRoute<A extends unknown[]>(
  fn: (ctx: RouteContext, ...args: A) => Promise<Response>,
): (req: Request, ...args: A) => Promise<Response> {
  return async (req, ...args) => {
    try {
      checkAuth(req);
      const url = new URL(req.url);
      const ctx: RouteContext = {
        req,
        url,
        origin: url.origin,
        debug: url.searchParams.get("debug") === "1",
        warnings: [],
      };
      const res = await fn(ctx, ...args);
      if (ctx.warnings.length) console.warn(`[wristbridge] ${url.pathname}:`, ctx.warnings.join(" | "));
      return res;
    } catch (err) {
      return errorResponse(err);
    }
  };
}

/** Query params except reserved ones become screen params. */
export function screenParams(url: URL): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [k, v] of url.searchParams) if (k !== "debug") params[k] = v;
  return params;
}
