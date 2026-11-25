/** Loading and validating watch.json + the web app manifest. */
import { TTLCache } from "./cache";
import type { WatchDescriptor } from "./descriptor-types";
import { upstream } from "./errors";
import { getAppJSON, fetchAppJSON } from "./http";
import type { ResolvedApp } from "./registry";
import { color } from "./sanitize";
import type { AppInfo } from "./watchui";

const DESCRIPTOR_TTL = 300; // seconds
const descriptorCache = new TTLCache<WatchDescriptor>(100);
const manifestCache = new TTLCache<Partial<AppInfo>>(100);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Structural checks only; the JSON Schema in /schema is the full contract. */
export function validateDescriptor(raw: unknown, appId = "app"): WatchDescriptor {
  const fail = (msg: string) => upstream(`${appId}/watch.json: ${msg}`);
  if (!isObject(raw)) throw fail("not a JSON object");
  if (raw.watchVersion !== "1") throw fail(`unsupported watchVersion ${JSON.stringify(raw.watchVersion)}`);
  if (typeof raw.entry !== "string") throw fail("missing entry");
  if (!isObject(raw.screens) || Object.keys(raw.screens).length === 0) throw fail("no screens");
  if (!(raw.entry in raw.screens)) throw fail(`entry screen "${raw.entry}" is not defined`);
  for (const [id, s] of Object.entries(raw.screens)) {
    if (!isObject(s) || typeof s.title !== "string") throw fail(`screen "${id}" needs a title`);
    if (s.source !== undefined && (!isObject(s.source) || typeof s.source.url !== "string")) {
      throw fail(`screen "${id}" has an invalid source`);
    }
    if (s.mode === "native" && s.source === undefined) throw fail(`native screen "${id}" needs a source`);
  }
  if (raw.actions !== undefined && !isObject(raw.actions)) throw fail("actions must be an object");
  return raw as unknown as WatchDescriptor;
}

export async function loadDescriptor(app: ResolvedApp): Promise<WatchDescriptor> {
  return descriptorCache.getOrSet(`${app.id}|${app.origin}`, DESCRIPTOR_TTL, async () =>
    validateDescriptor(await getAppJSON(app, app.descriptor), app.id),
  );
}

type ManifestIcon = { src?: unknown; sizes?: unknown; purpose?: unknown; type?: unknown };

/** Pick the icon closest to 96px that the watch can render (no SVG). */
export function pickIcon(icons: unknown, base: string): string | undefined {
  if (!Array.isArray(icons)) return undefined;
  const scored = (icons as ManifestIcon[])
    .filter((i) => typeof i.src === "string" && !String(i.src).endsWith(".svg") && i.type !== "image/svg+xml")
    .map((i) => {
      const size = Number(String(i.sizes ?? "").split("x")[0]) || 512;
      return { src: String(i.src), score: Math.abs(size - 96) + (String(i.purpose ?? "").includes("maskable") ? 50 : 0) };
    })
    .sort((a, b) => a.score - b.score);
  const best = scored[0];
  if (!best) return undefined;
  try {
    return new URL(best.src, base).toString();
  } catch {
    return undefined;
  }
}

export async function loadManifestInfo(app: ResolvedApp): Promise<Partial<AppInfo>> {
  return manifestCache.getOrSet(`${app.id}|${app.origin}`, DESCRIPTOR_TTL, async () => {
    // The manifest is optional: a missing one just means fewer niceties.
    try {
      const res = await fetchAppJSON(app, app.manifest);
      if (!res.ok || !isObject(res.json)) return {};
      const m = res.json;
      const manifestUrl = new URL(app.manifest, app.origin).toString();
      return {
        name: typeof m.name === "string" ? m.name : undefined,
        shortName: typeof m.short_name === "string" ? m.short_name : undefined,
        themeColor: color(m.theme_color),
        icon: pickIcon(m.icons, manifestUrl),
      };
    } catch {
      return {};
    }
  });
}

export async function loadAppInfo(app: ResolvedApp): Promise<AppInfo> {
  const [descriptor, manifest] = await Promise.all([loadDescriptor(app), loadManifestInfo(app)]);
  const info: AppInfo = {
    id: app.id,
    name: manifest.name ?? descriptor.name ?? app.id,
    shortName: manifest.shortName,
    themeColor: manifest.themeColor,
    icon: manifest.icon,
    entry: descriptor.entry,
  };
  for (const k of Object.keys(info) as (keyof AppInfo)[]) if (info[k] === undefined) delete info[k];
  return info;
}

export function clearDescriptorCaches(): void {
  descriptorCache.invalidate("");
  manifestCache.invalidate("");
}
