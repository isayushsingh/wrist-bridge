/**
 * The template engine.
 *
 * It turns a template (JSON with {{bindings}}) plus some data into plain JSON.
 *
 *   "{{data.open}}"                   -> 3          (a whole-string binding keeps the raw type)
 *   "Open: {{data.open}}"             -> "Open: 3"  (mixed text is always a string)
 *   "{{task.due | date}}"             -> "25 Nov"   (filters, chained with |)
 *   { "$repeat": "data.tasks", "$as": "task", ... }  -> one copy per array item
 *   { "$if": "data.tasks | len", ... }               -> kept only when truthy
 *   { "$unless": "data.tasks | len", ... }           -> kept only when falsy
 *
 * $repeat / $if / $unless work on objects that sit inside an array.
 * Full reference: docs/04-descriptor.md
 */

export type TemplateContext = Record<string, unknown>;

export type RenderOptions = {
  /** Collects non-fatal problems (unknown filter, $repeat over a non-array, ...). */
  warnings?: string[];
  /** URL mode: every substituted value is encodeURIComponent()-ed. */
  encode?: boolean;
};

export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateError";
  }
}

const MAX_DEPTH = 16;
const MAX_REPEAT = 200;
const WHOLE = /^\{\{\s*([\s\S]+?)\s*\}\}$/;
const ANY = /\{\{\s*([\s\S]+?)\s*\}\}/g;

// ---------------------------------------------------------------------------
// Expressions:  path | filter:arg1:arg2 | filter
// ---------------------------------------------------------------------------

/** Split on `sep`, ignoring separators inside '...' or "..." quotes. */
export function splitTopLevel(input: string, sep: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (const ch of input) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
    } else if (ch === sep) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((p) => p.trim());
}

/** A literal ('text', "text", 12, true, false, null) or a dotted path into the context. */
function operand(token: string, ctx: TemplateContext): unknown {
  if (token.length >= 2 && (token[0] === "'" || token[0] === '"') && token.endsWith(token[0])) {
    return token.slice(1, -1);
  }
  if (/^-?\d+(\.\d+)?$/.test(token)) return Number(token);
  if (token === "true") return true;
  if (token === "false") return false;
  if (token === "null") return null;
  return resolvePath(ctx, token);
}

/** resolvePath({ data: { tasks: [{ title: "A" }] } }, "data.tasks.0.title") === "A" */
export function resolvePath(ctx: unknown, path: string): unknown {
  if (!path) return undefined;
  let current: unknown = ctx;
  for (const key of path.split(".")) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function truthy(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return !(
    value === undefined ||
    value === null ||
    value === false ||
    value === 0 ||
    value === "" ||
    value === "false" ||
    (typeof value === "number" && Number.isNaN(value))
  );
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

type Filter = (value: unknown, args: unknown[]) => unknown;

/** Every filter is a pure function. Add new ones here and document them in docs/04-descriptor.md. */
export const FILTERS: Record<string, Filter> = {
  default: (v, [fallback]) => (v === undefined || v === null || v === "" ? fallback : v),
  upper: (v) => stringify(v).toUpperCase(),
  lower: (v) => stringify(v).toLowerCase(),
  truncate: (v, [n]) => {
    const s = stringify(v);
    const max = Math.max(1, toNumber(n ?? 40));
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
  },
  round: (v, [digits]) => {
    const f = 10 ** toNumber(digits ?? 0);
    return Math.round(toNumber(v) * f) / f;
  },
  number: (v, [digits]) =>
    new Intl.NumberFormat("en", { maximumFractionDigits: toNumber(digits ?? 0) }).format(toNumber(v)),
  percent: (v, [digits]) => {
    const f = 10 ** toNumber(digits ?? 0);
    return `${Math.round(toNumber(v) * 100 * f) / f}%`;
  },
  len: (v) => {
    if (Array.isArray(v) || typeof v === "string") return v.length;
    if (v && typeof v === "object") return Object.keys(v).length;
    return 0;
  },
  first: (v) => (Array.isArray(v) ? v[0] : v),
  last: (v) => (Array.isArray(v) ? v[v.length - 1] : v),
  not: (v) => !truthy(v),
  eq: (v, [x]) => stringify(v) === stringify(x),
  ne: (v, [x]) => stringify(v) !== stringify(x),
  gt: (v, [x]) => toNumber(v) > toNumber(x),
  lt: (v, [x]) => toNumber(v) < toNumber(x),
  pick: (v, [whenTrue, whenFalse]) => (truthy(v) ? whenTrue : whenFalse),
  date: (v) => {
    const d = toDate(v);
    return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : stringify(v);
  },
  time: (v) => {
    const d = toDate(v);
    return d
      ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
      : stringify(v);
  },
  json: (v) => JSON.stringify(v ?? null),
};

export function evaluate(expression: string, ctx: TemplateContext, opts: RenderOptions = {}): unknown {
  const [head = "", ...filters] = splitTopLevel(expression, "|");
  let value = operand(head, ctx);
  for (const filterExpr of filters) {
    const [name = "", ...rawArgs] = splitTopLevel(filterExpr, ":");
    const filter = FILTERS[name];
    if (!filter) {
      opts.warnings?.push(`Unknown filter "${name}" in {{${expression}}}`);
      continue;
    }
    value = filter(value, rawArgs.map((a) => operand(a, ctx)));
  }
  return value;
}

export function stringify(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Interpolate a single string. A string that is *only* a binding returns the raw value. */
export function interpolate(input: string, ctx: TemplateContext, opts: RenderOptions = {}): unknown {
  if (!input.includes("{{")) return input;
  const whole = WHOLE.exec(input);
  if (whole && !opts.encode) return evaluate(whole[1] ?? "", ctx, opts);
  return input.replace(ANY, (_, expr: string) => {
    const s = stringify(evaluate(expr, ctx, opts));
    return opts.encode ? encodeURIComponent(s) : s;
  });
}

/** Interpolate a URL template; substituted values are URL-encoded. */
export function interpolateUrl(input: string, ctx: TemplateContext, opts: RenderOptions = {}): string {
  return String(interpolate(input, ctx, { ...opts, encode: true }));
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function withoutDirectives(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (!k.startsWith("$")) out[k] = v;
  return out;
}

function passesConditions(el: Record<string, unknown>, ctx: TemplateContext, opts: RenderOptions): boolean {
  if (typeof el.$if === "string" && !truthy(evaluate(el.$if, ctx, opts))) return false;
  if (typeof el.$unless === "string" && truthy(evaluate(el.$unless, ctx, opts))) return false;
  return true;
}

/** Render any JSON value (object, array, string, ...) against a context. */
export function render(template: unknown, ctx: TemplateContext, opts: RenderOptions = {}, depth = 0): unknown {
  if (depth > MAX_DEPTH) throw new TemplateError(`Template nested deeper than ${MAX_DEPTH} levels`);

  if (typeof template === "string") return interpolate(template, ctx, opts);

  if (Array.isArray(template)) {
    const out: unknown[] = [];
    for (const el of template) {
      if (!isPlainObject(el)) {
        out.push(render(el, ctx, opts, depth + 1));
        continue;
      }
      if (typeof el.$repeat === "string") {
        const list = evaluate(el.$repeat, ctx, opts);
        if (!Array.isArray(list)) {
          if (list !== undefined && list !== null) opts.warnings?.push(`$repeat "${el.$repeat}" is not an array`);
          continue;
        }
        if (list.length > MAX_REPEAT) opts.warnings?.push(`$repeat "${el.$repeat}" capped at ${MAX_REPEAT} items`);
        const as = typeof el.$as === "string" && el.$as ? el.$as : "item";
        const body = withoutDirectives(el);
        list.slice(0, MAX_REPEAT).forEach((item, index) => {
          const itemCtx = { ...ctx, [as]: item, index };
          if (passesConditions(el, itemCtx, opts)) out.push(render(body, itemCtx, opts, depth + 1));
        });
        continue;
      }
      if (!passesConditions(el, ctx, opts)) continue;
      out.push(render(withoutDirectives(el), ctx, opts, depth + 1));
    }
    return out;
  }

  if (isPlainObject(template)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(template)) {
      if (k.startsWith("$")) continue;
      out[k] = render(v, ctx, opts, depth + 1);
    }
    return out;
  }

  return template;
}
