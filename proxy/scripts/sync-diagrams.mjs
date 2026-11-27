// Copies the rendered diagrams from ../docs/diagrams into public/diagrams for the landing page.
// docs/ stays the source of truth; run `npm run sync:diagrams` after re-rendering a diagram.
// Skips quietly when docs/ isn't there (e.g. a deploy that only uploads proxy/).
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "..", "docs", "diagrams");
const out = join(root, "public", "diagrams");

if (!existsSync(src)) {
  console.log("sync-diagrams: ../docs/diagrams not found, keeping existing copies");
  process.exit(0);
}
mkdirSync(out, { recursive: true });
const files = readdirSync(src).filter((f) => f.endsWith(".png"));
for (const f of files) copyFileSync(join(src, f), join(out, f));
console.log(`sync-diagrams: copied ${files.length} diagrams`);
