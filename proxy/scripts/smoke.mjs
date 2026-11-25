#!/usr/bin/env node
/**
 * Smoke test against a running proxy (local or deployed).
 *   BASE=http://localhost:3000 KEY=dev-key npm run smoke
 * Exits non-zero on the first failure.
 */
const BASE = process.env.BASE ?? "http://localhost:3000";
const KEY = process.env.KEY ?? "";
const headers = { "content-type": "application/json", ...(KEY ? { "x-bridge-key": KEY } : {}) };

let failures = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failures++;
    console.log(`✗ ${name}: ${e.message}`);
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const get = (p, h = headers) => fetch(`${BASE}${p}`, { headers: h });

await check("health", async () => {
  const r = await get("/api/v1/health", {});
  assert(r.ok, `status ${r.status}`);
});

if (KEY) {
  await check("rejects missing key", async () => {
    const r = await get("/api/v1/apps", {});
    assert(r.status === 401, `expected 401, got ${r.status}`);
  });
}

let entry = "home";
await check("lists apps", async () => {
  const r = await get("/api/v1/apps");
  const body = await r.json();
  assert(r.ok, JSON.stringify(body));
  const demo = body.apps.find((a) => a.id === "demo");
  assert(demo, "demo app missing");
  entry = demo.entry;
});

let etag = "";
await check("renders entry screen", async () => {
  const r = await get(`/api/v1/apps/demo/screens/${entry}?debug=1`);
  const doc = await r.json();
  assert(r.ok, JSON.stringify(doc));
  assert(doc.schemaVersion === "1" && Array.isArray(doc.body) && doc.body.length > 0, "bad document");
  assert(!doc.warnings?.length, `warnings: ${doc.warnings}`);
});

await check("sends an ETag", async () => {
  const r = await get(`/api/v1/apps/demo/screens/${entry}`);
  etag = r.headers.get("etag") ?? "";
  assert(etag, "no etag header");
});

await check("answers 304 for a matching ETag", async () => {
  const r = await get(`/api/v1/apps/demo/screens/${entry}`, { ...headers, "if-none-match": etag });
  assert(r.status === 304, `expected 304, got ${r.status}`);
});

await check("runs an action", async () => {
  const r = await fetch(`${BASE}/api/v1/apps/demo/actions/toggleTask`, {
    method: "POST",
    headers,
    body: JSON.stringify({ payload: { value: true }, params: { id: "1" } }),
  });
  const body = await r.json();
  assert(r.ok && body.ok, JSON.stringify(body));
});

await check("renders complication", async () => {
  const r = await get("/api/v1/apps/demo/complication");
  const body = await r.json();
  assert(r.ok && typeof body.text === "string", JSON.stringify(body));
});

await check("unknown screen is a clean 404", async () => {
  const r = await get("/api/v1/apps/demo/screens/nope");
  const body = await r.json();
  assert(r.status === 404 && body.error?.message, JSON.stringify(body));
});

process.exit(failures ? 1 : 0);
