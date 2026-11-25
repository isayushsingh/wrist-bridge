# 08 · Roadmap, portfolio and interview notes

## Milestones

| # | Milestone | Done when | Size |
|---|---|---|---|
| M0 | **First compile** | Watch app builds and runs against the local proxy in the Simulator | ½ day |
| M1 | **Your real PWA** | One of your own PWAs has a `watch.json` and works on your wrist | 1–2 days |
| M2 | **Polish** | App icons from the manifest cached on disk; pull-to-refresh feel; Digital Crown scrolling checked; empty states | 2 days |
| M3 | **Demo assets** | 60-second screen recording (preview + watch), 3 screenshots, README badges | 1 day |
| M4 | **Shared cache** | `TTLCache` replaced by Vercel KV / Upstash behind the same interface | 1 day |
| M5 | **Per-device tokens** | `/api/v1/devices/register` issues tokens; the shared key stays only for admin | 2 days |
| M6 | **Push** | PWA calls `POST /api/v1/apps/:id/notify` → APNs → watch notification (needs the paid Apple program) | 3 days |
| M7 | **Schema v2 negotiation** | Watch sends `x-watchui-version`; proxy downgrades new nodes for old clients | 1 day |
| M8 | **npm package** | `create-wristbridge` scaffolds a watch.json from a PWA's OpenAPI spec | stretch |

Suggested order: M0 → M1 → M3 (ship it on GitHub) → the rest as interview talking points.

## Resume line

> **WristBridge**: open-source framework that brings any PWA to Apple Watch as a native app. A server-driven UI schema (JSON Schema), a template-based Next.js proxy on Vercel (same-origin fetch, sanitizer, ETag caching), and a SwiftUI watchOS renderer with offline cache and WidgetKit complications. *TypeScript · Swift · SwiftUI · Next.js*

## Interview talking points

1. **Why server-driven UI?** One binary for every app, and screens change without an App Store release. Airbnb, Uber and Lyft use the same pattern; mention [design decision D1](01-architecture.md#7-design-decisions-and-trade-offs).
2. **Schema evolution:** additive changes are safe because of tolerant decoding (D5); breaking changes need version negotiation (M7).
3. **Security:** SSRF guard, URL encoding of bindings, timing-safe key compare, tokens kept on the server ([06](06-security.md)).
4. **Performance on a constrained device:** ETag/304, node budgets, disk cache, and ttl-based upstream caching.
5. **Resilience:** sanitize instead of reject; offline fallback; one failing app doesn't break the app list (`Promise.allSettled`).
6. **Testing:** pure-function tests plus an in-process pipeline test validated against the formal JSON Schema.
7. **What you'd do at scale:** a shared cache (M4), per-user auth (M5), rate limiting, observability (structured logs per app and screen), and a CDN for public screens.

## Why not a browser engine?

A real browser engine needs HTML, CSS layout, a JS engine, and years of compatibility work. watchOS also forbids JIT and has tight memory limits. WristBridge avoids the problem: the **phone-sized web stays on the server**, and the watch only receives a few KB of layout instructions. That is the same reason Apple's own watch apps are native.
