/**
 * The core pipeline:  watch.json + PWA data  ->  WatchUI document.
 *
 *   1. find the screen definition in watch.json
 *   2. fetch its data source (same-origin, cached for `ttl` seconds)
 *   3. render the template with { data, params, app }   (or take the body as-is in native mode)
 *   4. sanitize: coerce, trim, drop invalid nodes
 */
import { TTLCache } from "./cache";
import type { WatchDescriptor } from "./descriptor-types";
import { badRequest, notFound, upstream } from "./errors";
import { fetchAppJSON, getAppJSON } from "./http";
import type { ResolvedApp } from "./registry";
import { color, num, sanitizeBody, str } from "./sanitize";
import { interpolate, interpolateUrl, render, stringify, type TemplateContext } from "./template";
import {
  SCHEMA_VERSION,
  type ActionResult,
  type ComplicationPayload,
  type ThenBehavior,
  type WatchDocument,
} from "./watchui";

const DEFAULT_TTL = 60;
const dataCache = new TTLCache<unknown>(500);

export type Params = Record<string, string>;

async function loadSource(
  app: ResolvedApp,
  source: { url: string; method?: string } | undefined,
  ctx: TemplateContext,
  ttl: number,
): Promise<unknown> {
  if (!source) return {};
  const url = interpolateUrl(source.url, ctx);
  const method = source.method ?? "GET";
  const key = `${app.id}|${method}|${url}`;
  return dataCache.getOrSet(key, method === "GET" ? ttl : 0, () => getAppJSON(app, url, { method }));
}

export async function renderScreen(
  app: ResolvedApp,
  descriptor: WatchDescriptor,
  screenId: string,
  params: Params,
  warnings: string[] = [],
): Promise<WatchDocument> {
  const def = descriptor.screens[screenId];
  if (!def) throw notFound(`Screen "${screenId}"`);

  const ttl = Math.max(0, def.ttl ?? DEFAULT_TTL);
  const baseCtx: TemplateContext = { params, app: { id: app.id, origin: app.origin } };
  const data = await loadSource(app, def.source, baseCtx, ttl);
  const ctx: TemplateContext = { ...baseCtx, data };

  let rawBody: unknown;
  if (def.mode === "native") {
    rawBody = data && typeof data === "object" ? (data as Record<string, unknown>).body : undefined;
    if (!Array.isArray(rawBody)) throw upstream(`native screen "${screenId}" source must return { "body": [...] }`);
  } else {
    rawBody = render(def.template ?? [], ctx, { warnings });
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    screen: {
      id: screenId,
      title: str(interpolate(def.title, ctx, { warnings }), 40) ?? screenId,
      ...(color(def.tint) ? { tint: color(def.tint) } : {}),
    },
    ttl,
    body: sanitizeBody(rawBody, { baseUrl: app.origin, warnings }),
  };
}

export type ActionRequest = { payload?: unknown; params?: Params };

export async function performAction(
  app: ResolvedApp,
  descriptor: WatchDescriptor,
  actionId: string,
  req: ActionRequest,
  warnings: string[] = [],
): Promise<ActionResult> {
  const def = descriptor.actions?.[actionId];
  if (!def) throw notFound(`Action "${actionId}"`);

  const ctx: TemplateContext = { payload: req.payload ?? {}, params: req.params ?? {}, app: { id: app.id } };
  const url = interpolateUrl(def.url, ctx, { warnings });
  const body = def.body === undefined ? req.payload : render(def.body, ctx, { warnings });
  const method = def.method ?? "POST";
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) throw badRequest(`Unsupported method ${method}`);

  const res = await fetchAppJSON(app, url, { method, body: method === "DELETE" ? undefined : (body ?? {}) });

  // Data changed upstream: forget cached reads for this app so the next refresh is fresh.
  dataCache.invalidate(`${app.id}|`);

  const response = res.json;
  const upstreamMessage =
    response && typeof response === "object" ? str((response as Record<string, unknown>).message, 80) : undefined;
  const message = def.message
    ? str(stringify(interpolate(def.message, { ...ctx, response }, { warnings })), 80)
    : upstreamMessage;

  return {
    ok: res.ok,
    ...(res.ok ? (message ? { message } : {}) : { message: upstreamMessage ?? `Failed (${res.status})` }),
    ...(res.ok && def.then ? { then: def.then as ThenBehavior } : {}),
  };
}

export async function renderComplication(
  app: ResolvedApp,
  descriptor: WatchDescriptor,
  warnings: string[] = [],
): Promise<ComplicationPayload> {
  const def = descriptor.complication;
  if (!def) throw notFound(`Complication for "${app.id}"`);
  const ttl = Math.max(300, def.ttl ?? 900);
  const baseCtx: TemplateContext = { params: {}, app: { id: app.id } };
  const data = await loadSource(app, def.source, baseCtx, Math.min(ttl, 300));
  const out = render(def.template, { ...baseCtx, data }, { warnings }) as Record<string, unknown>;

  const gaugeRaw = out.gauge as Record<string, unknown> | undefined;
  const gaugeValue = gaugeRaw ? num(gaugeRaw.value) : undefined;
  const payload: ComplicationPayload = {
    text: str(out.text, 40) ?? descriptor.name ?? app.id,
    ttl,
  };
  const shortText = str(out.shortText, 6);
  if (shortText) payload.shortText = shortText;
  const symbol = str(out.symbol, 40);
  if (symbol) payload.symbol = symbol;
  const tint = color(out.tint);
  if (tint) payload.tint = tint;
  if (gaugeValue !== undefined) {
    payload.gauge = { value: Math.min(1, Math.max(0, gaugeValue)) };
    const label = str(gaugeRaw?.label, 12);
    if (label) payload.gauge.label = label;
  }
  return payload;
}

/** Exposed for tests. */
export function clearDataCache(): void {
  dataCache.invalidate("");
}
