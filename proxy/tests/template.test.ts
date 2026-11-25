import { describe, expect, it } from "vitest";
import { evaluate, interpolate, interpolateUrl, render, splitTopLevel } from "@/lib/template";

const ctx = {
  data: { open: 3, progress: 0.4, tasks: [{ id: "1", title: "A", done: true }, { id: "2", title: "B", done: false }] },
  params: { id: "a b/c" },
};

describe("template engine", () => {
  it("keeps raw types for whole-string bindings", () => {
    expect(interpolate("{{data.open}}", ctx)).toBe(3);
    expect(interpolate("Open: {{data.open}}", ctx)).toBe("Open: 3");
  });

  it("treats a string that starts and ends with different bindings as mixed text", () => {
    expect(interpolate("{{data.open}} · {{data.tasks.0.title}}", ctx)).toBe("3 · A");
    expect(interpolate("{{data.open}}{{data.open}}", ctx)).toBe("33");
  });

  it("applies chained filters with quoted args", () => {
    expect(evaluate("data.progress | percent", ctx)).toBe("40%");
    expect(evaluate("data.missing | default:'—'", ctx)).toBe("—");
    expect(evaluate("data.tasks | len | gt:1", ctx)).toBe(true);
    expect(evaluate("data.tasks.0.done | pick:'#22C55E':'#94A3B8'", ctx)).toBe("#22C55E");
  });

  it("does not split on separators inside quotes", () => {
    expect(splitTopLevel("a | default:'x|y'", "|")).toEqual(["a", "default:'x|y'"]);
  });

  it("URL-encodes values in URL mode", () => {
    expect(interpolateUrl("/api/tasks/{{params.id}}", ctx)).toBe("/api/tasks/a%20b%2Fc");
  });

  it("expands $repeat and filters per item with $if", () => {
    const out = render(
      [{ $repeat: "data.tasks", $as: "t", $if: "t.done | not", type: "row", title: "{{t.title}}" }],
      ctx,
    );
    expect(out).toEqual([{ type: "row", title: "B" }]);
  });

  it("supports $if / $unless on plain elements", () => {
    expect(render([{ $if: "data.open", type: "divider" }, { $unless: "data.open", type: "text" }], ctx)).toEqual([
      { type: "divider" },
    ]);
  });

  it("reports unknown filters as warnings instead of throwing", () => {
    const warnings: string[] = [];
    expect(evaluate("data.open | shout", ctx, { warnings })).toBe(3);
    expect(warnings[0]).toMatch(/Unknown filter/);
  });
});
