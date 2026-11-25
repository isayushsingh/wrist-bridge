/**
 * End-to-end through the library (no HTTP server): the demo watch.json + demo API,
 * rendered and validated against the formal JSON Schemas in /schema.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as aboutGET } from "@/app/demo/api/about/route";
import { GET as taskGET, DELETE as taskDELETE } from "@/app/demo/api/tasks/[id]/route";
import { POST as toggleTaskPOST } from "@/app/demo/api/tasks/[id]/toggle/route";
import { GET as tasksGET, POST as tasksPOST } from "@/app/demo/api/tasks/route";
import { validateDescriptor } from "@/lib/descriptor";
import type { ResolvedApp } from "@/lib/registry";
import { clearDataCache, performAction, renderComplication, renderScreen } from "@/lib/render";

const root = path.resolve(__dirname, "..", "..");
const load = (p: string) => JSON.parse(readFileSync(path.join(root, p), "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateDoc = ajv.compile(load("schema/watchui.v1.schema.json"));
const validateDesc = ajv.compile(load("schema/watch-descriptor.v1.schema.json"));

const app: ResolvedApp = { id: "demo", origin: "http://demo.test", descriptor: "/demo/watch.json", manifest: "/m" };
const descriptor = validateDescriptor(load("proxy/public/demo/watch.json"));

/** Route fetch() calls to the demo route handlers in-process. */
async function fakeFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const req = new Request(url, init);
  const method = (init?.method ?? "GET").toUpperCase();
  const m = /^\/demo\/api\/tasks\/([^/]+)(\/toggle)?$/.exec(url.pathname);
  const params = { params: Promise.resolve({ id: decodeURIComponent(m?.[1] ?? "") }) };
  if (url.pathname === "/demo/api/tasks") return method === "POST" ? tasksPOST(req) : tasksGET();
  if (url.pathname === "/demo/api/about") return aboutGET();
  if (m && m[2]) return toggleTaskPOST(req, params);
  if (m) return method === "DELETE" ? taskDELETE(req, params) : taskGET(req, params);
  return new Response("not found", { status: 404 });
}

beforeEach(() => {
  clearDataCache();
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
});
afterEach(() => vi.unstubAllGlobals());

describe("demo pipeline", () => {
  it("demo watch.json matches the descriptor schema", () => {
    expect(validateDesc(load("proxy/public/demo/watch.json")), JSON.stringify(validateDesc.errors)).toBe(true);
  });

  it.each(["home", "about"])("renders %s into a valid WatchUI document without warnings", async (screen) => {
    const warnings: string[] = [];
    const doc = await renderScreen(app, descriptor, screen, {}, warnings);
    expect(validateDoc(doc), JSON.stringify(validateDoc.errors)).toBe(true);
    expect(warnings).toEqual([]);
    expect(doc.body.length).toBeGreaterThan(0);
  });

  it("renders a detail screen with params and toggles it", async () => {
    const before = await renderScreen(app, descriptor, "detail", { id: "1" });
    expect(validateDoc(before), JSON.stringify(validateDoc.errors)).toBe(true);
    const toggle = before.body.find((n) => n.type === "toggle");
    expect(toggle).toMatchObject({ type: "toggle", isOn: false });

    const result = await performAction(app, descriptor, "toggleTask", { payload: { value: true }, params: { id: "1" } });
    expect(result).toEqual({ ok: true, message: "Marked done", then: "refresh" });

    const after = await renderScreen(app, descriptor, "detail", { id: "1" });
    expect(after.body.find((n) => n.type === "toggle")).toMatchObject({ isOn: true });
  });

  it("reports upstream failures as ok:false", async () => {
    const result = await performAction(app, descriptor, "deleteTask", { params: { id: "nope" } });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Task not found");
  });

  it("renders the complication", async () => {
    const c = await renderComplication(app, descriptor);
    expect(c.text).toMatch(/open/);
    expect(c.gauge?.value).toBeGreaterThanOrEqual(0);
    expect(c.gauge?.value).toBeLessThanOrEqual(1);
  });

  it("every example document validates", () => {
    const dir = path.join(root, "schema/examples");
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".watchui.json"))) {
      expect(validateDoc(load(`schema/examples/${f}`)), `${f}: ${JSON.stringify(validateDoc.errors)}`).toBe(true);
    }
  });
});
