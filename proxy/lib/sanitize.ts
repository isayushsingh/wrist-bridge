/**
 * The sanitizer: the last gate before JSON leaves the proxy.
 *
 * Templates and "native" sources can produce anything. The watch should only ever
 * receive valid, small WatchUI. This module:
 *   - coerces types  ("3" -> 3 for gauges, 3 -> "3" for metric values, "true" -> true)
 *   - drops invalid nodes instead of failing the whole screen
 *   - enforces budgets (node count, depth, text length, chart points) so payloads stay tiny
 *   - makes image URLs absolute
 * Every drop/trim is reported as a warning (visible with ?debug=1 and in the web preview).
 */
import type { Action, CallAction, Node, ThenBehavior } from "./watchui";

export const LIMITS = {
  maxNodes: 150,
  maxDepth: 4,
  maxChildren: 60,
  maxText: 400,
  maxTitle: 120,
  maxPoints: 40,
} as const;

export type SanitizeOptions = { baseUrl?: string; warnings?: string[] };

type State = { count: number; warnings: string[]; baseUrl?: string };

const COLOR = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i;
const SHORT_COLOR = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const SYMBOL = /^[a-z0-9]+(\.[a-z0-9]+)*$/;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function str(v: unknown, max: number = LIMITS.maxText): string | undefined {
  if (typeof v === "number" || typeof v === "boolean") v = String(v);
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

export function bool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === 1 || v === "1") return true;
  if (v === "false" || v === 0 || v === "0" || v === "" || v === null) return false;
  return undefined;
}

export function color(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (COLOR.test(s)) return s.toUpperCase();
  const m = SHORT_COLOR.exec(s);
  if (m) return `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`.toUpperCase();
  return undefined;
}

function symbol(v: unknown): string | undefined {
  return typeof v === "string" && SYMBOL.test(v.trim()) ? v.trim() : undefined;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

/** Drop undefined keys so the JSON stays compact. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  for (const k of Object.keys(obj)) if (obj[k] === undefined) delete obj[k];
  return obj;
}

const THEN = ["refresh", "pop", "none"] as const satisfies readonly ThenBehavior[];

export function sanitizeAction(v: unknown, warnings: string[] = []): Action | undefined {
  if (!isObject(v)) return undefined;
  switch (v.type) {
    case "navigate": {
      const screen = str(v.screen, 64);
      if (!screen) {
        warnings.push("navigate action without screen dropped");
        return undefined;
      }
      let params: Record<string, string> | undefined;
      if (isObject(v.params)) {
        params = {};
        for (const [k, val] of Object.entries(v.params)) {
          const s = str(val, 200);
          if (s !== undefined) params[k] = s;
        }
      }
      return compact({ type: "navigate" as const, screen, params });
    }
    case "call": {
      const id = str(v.id, 64);
      if (!id) {
        warnings.push("call action without id dropped");
        return undefined;
      }
      return compact({
        type: "call",
        id,
        payload: v.payload === undefined ? undefined : JSON.parse(JSON.stringify(v.payload)),
        confirm: str(v.confirm, LIMITS.maxTitle),
        then: oneOf(v.then, THEN),
      } satisfies CallAction);
    }
    case "refresh":
      return { type: "refresh" };
    default:
      warnings.push(`unknown action type "${String(v.type)}" dropped`);
      return undefined;
  }
}

function absoluteUrl(v: unknown, baseUrl?: string): string | undefined {
  if (typeof v !== "string" || !v.trim()) return undefined;
  try {
    const u = new URL(v.trim(), baseUrl);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function children(v: unknown, st: State, depth: number, where: string): Node[] {
  if (!Array.isArray(v)) return [];
  if (v.length > LIMITS.maxChildren) st.warnings.push(`${where}: children capped at ${LIMITS.maxChildren}`);
  return sanitizeList(v.slice(0, LIMITS.maxChildren), st, depth + 1);
}

function sanitizeNode(raw: unknown, st: State, depth: number): Node | undefined {
  if (!isObject(raw)) return undefined;
  const type = raw.type;
  const w = st.warnings;

  switch (type) {
    case "text": {
      const text = str(raw.text);
      if (!text) return undefined;
      return compact({
        type,
        text,
        style: oneOf(raw.style, ["title", "headline", "body", "caption", "footnote"] as const),
        color: color(raw.color),
        align: oneOf(raw.align, ["leading", "center", "trailing"] as const),
        lines: num(raw.lines) ? Math.max(1, Math.round(num(raw.lines)!)) : undefined,
      });
    }
    case "section":
    case "stack": {
      if (depth >= LIMITS.maxDepth) {
        w.push(`${type} nested deeper than ${LIMITS.maxDepth} dropped`);
        return undefined;
      }
      const kids = children(raw.children, st, depth, type);
      if (kids.length === 0) return undefined;
      if (type === "section") {
        return compact({ type, title: str(raw.title, LIMITS.maxTitle), footer: str(raw.footer), children: kids });
      }
      return compact({
        type,
        axis: oneOf(raw.axis, ["vertical", "horizontal"] as const),
        spacing: num(raw.spacing),
        children: kids,
      });
    }
    case "row": {
      const title = str(raw.title, LIMITS.maxTitle);
      if (!title) {
        w.push("row without title dropped");
        return undefined;
      }
      return compact({
        type,
        title,
        subtitle: str(raw.subtitle, LIMITS.maxTitle),
        icon: symbol(raw.icon),
        value: str(raw.value, 24),
        tint: color(raw.tint),
        action: sanitizeAction(raw.action, w),
      });
    }
    case "metric": {
      const label = str(raw.label, 40);
      const value = str(raw.value, 24);
      if (!label || value === undefined) {
        w.push("metric without label/value dropped");
        return undefined;
      }
      return compact({
        type,
        label,
        value,
        unit: str(raw.unit, 12),
        trend: oneOf(raw.trend, ["up", "down", "flat"] as const),
        tint: color(raw.tint),
      });
    }
    case "gauge": {
      const label = str(raw.label, 40);
      const value = num(raw.value);
      if (!label || value === undefined) {
        w.push("gauge without label/numeric value dropped");
        return undefined;
      }
      return compact({
        type,
        label,
        value,
        min: num(raw.min),
        max: num(raw.max),
        valueLabel: str(raw.valueLabel, 24),
        tint: color(raw.tint),
      });
    }
    case "chart": {
      const pts = Array.isArray(raw.points) ? raw.points : [];
      const points = pts
        .map((p) => (isObject(p) ? { x: str(p.x, 16) ?? "", y: num(p.y) } : undefined))
        .filter((p): p is { x: string; y: number } => !!p && p.y !== undefined);
      if (points.length === 0) {
        w.push("chart without numeric points dropped");
        return undefined;
      }
      if (points.length > LIMITS.maxPoints) w.push(`chart points capped at ${LIMITS.maxPoints}`);
      return compact({
        type,
        kind: oneOf(raw.kind, ["bar", "line"] as const),
        title: str(raw.title, LIMITS.maxTitle),
        height: num(raw.height) ? Math.max(20, num(raw.height)!) : undefined,
        tint: color(raw.tint),
        points: points.slice(-LIMITS.maxPoints),
      });
    }
    case "image": {
      const url = absoluteUrl(raw.url, st.baseUrl);
      if (!url) {
        w.push("image with invalid url dropped");
        return undefined;
      }
      return compact({ type, url, alt: str(raw.alt, LIMITS.maxTitle), height: num(raw.height) });
    }
    case "button": {
      const label = str(raw.label, 60);
      const action = sanitizeAction(raw.action, w);
      if (!label || !action) {
        w.push("button without label/action dropped");
        return undefined;
      }
      return compact({
        type,
        label,
        icon: symbol(raw.icon),
        role: oneOf(raw.role, ["normal", "destructive"] as const),
        tint: color(raw.tint),
        action,
      });
    }
    case "toggle": {
      const label = str(raw.label, 60);
      const action = sanitizeAction(raw.action, w);
      if (!label || !action || action.type !== "call") {
        w.push("toggle needs a label and a call action; dropped");
        return undefined;
      }
      return { type, label, isOn: bool(raw.isOn) ?? false, action };
    }
    case "divider":
      return { type };
    default:
      w.push(`unknown node type "${String(type)}" dropped`);
      return undefined;
  }
}

function sanitizeList(list: unknown[], st: State, depth: number): Node[] {
  const out: Node[] = [];
  for (const raw of list) {
    if (st.count >= LIMITS.maxNodes) {
      st.warnings.push(`node budget (${LIMITS.maxNodes}) reached; rest of screen trimmed`);
      break;
    }
    const node = sanitizeNode(raw, st, depth);
    if (node) {
      st.count += 1;
      out.push(node);
    }
  }
  return out;
}

/** Sanitize a screen body. Never throws; returns only valid nodes. */
export function sanitizeBody(body: unknown, opts: SanitizeOptions = {}): Node[] {
  const st: State = { count: 0, warnings: opts.warnings ?? [], baseUrl: opts.baseUrl };
  if (!Array.isArray(body)) {
    st.warnings.push("screen body is not an array");
    return [];
  }
  return sanitizeList(body, st, 0);
}
