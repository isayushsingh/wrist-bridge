/**
 * WatchUI v1 — the JSON "language" the watch app understands.
 * Formal spec: ../schema/watchui.v1.schema.json and ../docs/03-watchui-schema.md
 *
 * Keep this file, the JSON Schema and watch/Shared/Model/WatchUI.swift in sync.
 */

export const SCHEMA_VERSION = "1" as const;

export type ThenBehavior = "refresh" | "pop" | "none";

export type NavigateAction = { type: "navigate"; screen: string; params?: Record<string, string> };
export type CallAction = {
  type: "call";
  id: string;
  payload?: unknown;
  confirm?: string;
  then?: ThenBehavior;
};
export type RefreshAction = { type: "refresh" };
export type Action = NavigateAction | CallAction | RefreshAction;

export type TextNode = {
  type: "text";
  text: string;
  style?: "title" | "headline" | "body" | "caption" | "footnote";
  color?: string;
  align?: "leading" | "center" | "trailing";
  lines?: number;
};
export type SectionNode = { type: "section"; title?: string; footer?: string; children: Node[] };
export type StackNode = {
  type: "stack";
  axis?: "vertical" | "horizontal";
  spacing?: number;
  children: Node[];
};
export type RowNode = {
  type: "row";
  title: string;
  subtitle?: string;
  icon?: string;
  value?: string;
  tint?: string;
  action?: Action;
};
export type MetricNode = {
  type: "metric";
  label: string;
  value: string;
  unit?: string;
  trend?: "up" | "down" | "flat";
  tint?: string;
};
export type GaugeNode = {
  type: "gauge";
  label: string;
  value: number;
  min?: number;
  max?: number;
  valueLabel?: string;
  tint?: string;
};
export type ChartNode = {
  type: "chart";
  kind?: "bar" | "line";
  title?: string;
  height?: number;
  tint?: string;
  points: { x: string; y: number }[];
};
export type ImageNode = { type: "image"; url: string; alt?: string; height?: number };
export type ButtonNode = {
  type: "button";
  label: string;
  icon?: string;
  role?: "normal" | "destructive";
  tint?: string;
  action: Action;
};
export type ToggleNode = { type: "toggle"; label: string; isOn: boolean; action: CallAction };
export type DividerNode = { type: "divider" };

export type Node =
  | TextNode
  | SectionNode
  | StackNode
  | RowNode
  | MetricNode
  | GaugeNode
  | ChartNode
  | ImageNode
  | ButtonNode
  | ToggleNode
  | DividerNode;

export type NodeType = Node["type"];

export type WatchDocument = {
  schemaVersion: typeof SCHEMA_VERSION;
  screen: { id: string; title: string; tint?: string };
  ttl?: number;
  body: Node[];
};

/** Small payload for watch-face complications. gauge.value is always 0...1. */
export type ComplicationPayload = {
  text: string;
  shortText?: string;
  symbol?: string;
  tint?: string;
  gauge?: { value: number; label?: string };
  ttl: number;
};

export type ActionResult = { ok: boolean; message?: string; then?: ThenBehavior };

export type AppInfo = {
  id: string;
  name: string;
  shortName?: string;
  themeColor?: string;
  icon?: string;
  entry: string;
};
