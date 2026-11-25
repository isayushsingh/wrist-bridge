# 03 · WatchUI schema v1 (the building blocks)

WatchUI is the JSON the proxy sends to the watch. The formal definition is [`schema/watchui.v1.schema.json`](../schema/watchui.v1.schema.json) (JSON Schema 2020-12), and real examples are in [`schema/examples/`](../schema/examples).

It is defined in three places that **must stay in sync**:

| Place | Role |
|---|---|
| `schema/watchui.v1.schema.json` | The contract (tests validate against it) |
| `proxy/lib/watchui.ts` + `proxy/lib/sanitize.ts` | What the proxy produces |
| `watch/Shared/Model/WatchUI.swift` + `watch/WristBridge/Rendering/` | What the watch understands |

## Document

```json
{
  "schemaVersion": "1",
  "screen": { "id": "home", "title": "Tasks", "tint": "#6366F1" },
  "ttl": 30,
  "body": [ /* nodes */ ]
}
```

| Field | Meaning |
|---|---|
| `schemaVersion` | Always `"1"` for this version |
| `screen.title` | Shown in the watch's navigation bar (max 40 chars) |
| `screen.tint` | Accent color `#RRGGBB` / `#RRGGBBAA` |
| `ttl` | Seconds the data counts as fresh; also sets `Cache-Control` |
| `body` | Top-level `section`s become list sections with headers; every other node is one list row |

## Nodes

Colors are hex strings, and icons are [SF Symbols](https://developer.apple.com/sf-symbols/) names (e.g. `checkmark.circle.fill`).

| Type | Required | Optional | Looks like |
|---|---|---|---|
| `text` | `text` | `style` (title, headline, body, caption, footnote), `color`, `align` (leading, center, trailing), `lines` | A paragraph or heading |
| `section` | `children` | `title`, `footer` | Grouped list with a small uppercase header |
| `stack` | `children` | `axis` (vertical, horizontal), `spacing` | Side-by-side or stacked items (e.g. two metrics) |
| `row` | `title` | `subtitle`, `icon`, `value`, `tint`, `action` | The classic tappable list row, with a chevron if it navigates |
| `metric` | `label`, `value` (string) | `unit`, `trend` (up, down, flat), `tint` | Big number with a small label |
| `gauge` | `label`, `value` (number) | `min` (0), `max` (1), `valueLabel`, `tint` | Progress bar |
| `chart` | `points[{x,y}]` (≤ 40) | `kind` (bar, line), `title`, `height`, `tint` | Swift Charts mini chart |
| `image` | `url` (http/https) | `alt`, `height` | Remote image |
| `button` | `label`, `action` | `icon`, `role` (normal, destructive), `tint` | Full-width button |
| `toggle` | `label`, `isOn`, `action` (must be `call`) | – | Switch; sends `payload.value = true/false` |
| `divider` | – | – | Thin line |

## Actions

| Type | Fields | What the watch does |
|---|---|---|
| `navigate` | `screen`, `params` (string → string) | Pushes that screen of the same app; params become query parameters |
| `call` | `id`, `payload`, `confirm`, `then` (refresh, pop, none) | Optionally shows a confirm alert, then POSTs to the proxy, plays a haptic, shows a toast, then refreshes, goes back, or does nothing |
| `refresh` | – | Reloads the current screen |

`then` precedence: the proxy's action result `then` → the node's `then` → default `refresh`.

## Limits (enforced by the sanitizer)

| Limit | Value |
|---|---|
| Nodes per screen | 150 |
| Nesting depth | 4 (e.g. section → stack → metric) |
| Children per container | 60 |
| Text | 400 chars (titles 120, metric values 24) |
| Chart points | 40 (keeps the last 40) |

## Compatibility rules

- **Adding** an optional field or a new node type is backward compatible: older watches show a placeholder for unknown nodes.
- **Removing or renaming** a field, or changing its type, is a breaking change. That needs `schemaVersion: "2"`, and the proxy should keep serving v1 to old clients (send the version in a header, as noted in the roadmap).
