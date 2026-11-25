/**
 * Types for watch.json — the file a PWA publishes to describe its watch screens.
 * Formal spec: ../schema/watch-descriptor.v1.schema.json and ../docs/04-descriptor.md
 */
import type { ThenBehavior } from "./watchui";

export type SourceDef = { url: string; method?: "GET" | "POST" };

export type ScreenDef = {
  title: string;
  tint?: string;
  ttl?: number;
  /** template (default): proxy renders `template` with source data. native: source returns `{ body: Node[] }`. */
  mode?: "template" | "native";
  source?: SourceDef;
  template?: unknown[];
};

export type ActionDef = {
  url: string;
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  message?: string;
  then?: ThenBehavior;
};

export type ComplicationDef = {
  ttl?: number;
  source?: SourceDef;
  template: {
    text: string;
    shortText?: string;
    symbol?: string;
    tint?: string;
    gauge?: { value: string | number; label?: string };
  };
};

export type WatchDescriptor = {
  watchVersion: "1";
  name?: string;
  entry: string;
  screens: Record<string, ScreenDef>;
  actions?: Record<string, ActionDef>;
  complication?: ComplicationDef;
};
