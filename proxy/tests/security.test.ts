import { describe, expect, it } from "vitest";
import { resolveSameOrigin } from "@/lib/http";
import type { ResolvedApp } from "@/lib/registry";

const app: ResolvedApp = { id: "a", origin: "https://app.example", descriptor: "/w.json", manifest: "/m.json" };

describe("same-origin guard", () => {
  it("allows paths on the registered origin", () => {
    expect(resolveSameOrigin(app, "/api/x").href).toBe("https://app.example/api/x");
  });
  it.each(["https://evil.example/x", "//evil.example/x", "http://app.example/x", "https://app.example.evil.com/"])(
    "blocks %s",
    (u) => {
      expect(() => resolveSameOrigin(app, u)).toThrow(/outside the registered origin/);
    },
  );
});
