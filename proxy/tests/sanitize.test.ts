import { describe, expect, it } from "vitest";
import { LIMITS, sanitizeBody } from "@/lib/sanitize";

describe("sanitizer", () => {
  it("coerces types and drops invalid nodes with warnings", () => {
    const warnings: string[] = [];
    const out = sanitizeBody(
      [
        { type: "metric", label: "Open", value: 3 },
        { type: "gauge", label: "P", value: "0.5" },
        { type: "toggle", label: "Done", isOn: "true", action: { type: "call", id: "t" } },
        { type: "row" },
        { type: "hologram" },
        { type: "row", title: "x", tint: "#abc", icon: "not valid!" },
      ],
      { warnings },
    );
    expect(out).toEqual([
      { type: "metric", label: "Open", value: "3" },
      { type: "gauge", label: "P", value: 0.5 },
      { type: "toggle", label: "Done", isOn: true, action: { type: "call", id: "t" } },
      { type: "row", title: "x", tint: "#AABBCC" },
    ]);
    expect(warnings.length).toBe(2);
  });

  it("enforces the node budget", () => {
    const many = Array.from({ length: 500 }, (_, i) => ({ type: "text", text: `n${i}` }));
    expect(sanitizeBody(many).length).toBe(LIMITS.maxNodes);
  });

  it("limits nesting depth", () => {
    let node: unknown = { type: "text", text: "deep" };
    for (let i = 0; i < 8; i++) node = { type: "stack", children: [node] };
    const warnings: string[] = [];
    expect(sanitizeBody([node], { warnings })).toEqual([]);
    expect(warnings.some((w) => w.includes("nested deeper"))).toBe(true);
  });

  it("makes image URLs absolute and rejects other schemes", () => {
    const out = sanitizeBody(
      [{ type: "image", url: "/img/a.png" }, { type: "image", url: "javascript:alert(1)" }],
      { baseUrl: "https://app.example" },
    );
    expect(out).toEqual([{ type: "image", url: "https://app.example/img/a.png" }]);
  });
});
