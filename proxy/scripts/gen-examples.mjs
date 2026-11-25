#!/usr/bin/env node
/**
 * Regenerate schema/examples/* from a running proxy (dev server with the demo app).
 *   npm run dev   # in another terminal
 *   BASE=http://localhost:3000 KEY= node scripts/gen-examples.mjs
 */
import { writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../../schema/examples");
const BASE = process.env.BASE ?? "http://localhost:3000";
const headers = process.env.KEY ? { "x-bridge-key": process.env.KEY } : {};

const targets = {
  "apps.json": "/api/v1/apps",
  "home.watchui.json": "/api/v1/apps/demo/screens/home",
  "detail.watchui.json": "/api/v1/apps/demo/screens/detail?id=3",
  "about.watchui.json": "/api/v1/apps/demo/screens/about",
  "complication.json": "/api/v1/apps/demo/complication",
};

for (const [file, url] of Object.entries(targets)) {
  const res = await fetch(BASE + url, { headers });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  writeFileSync(path.join(out, file), JSON.stringify(await res.json(), null, 2) + "\n");
  console.log("wrote", file);
}
copyFileSync(path.resolve(here, "../public/demo/watch.json"), path.join(out, "demo.watch.json"));
console.log("wrote demo.watch.json");
