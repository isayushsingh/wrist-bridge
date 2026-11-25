# 04 · watch.json and the template language

`watch.json` is the **only thing your PWA needs to add**. It tells the proxy:
1. which screens exist,
2. where each screen's data comes from (an endpoint your PWA already has),
3. how to turn that data into WatchUI (a template),
4. which actions the watch may trigger.

Formal schema: [`schema/watch-descriptor.v1.schema.json`](../schema/watch-descriptor.v1.schema.json). The full working example is [`proxy/public/demo/watch.json`](../proxy/public/demo/watch.json).

## Connecting your PWA in 3 steps

1. **Serve the file** at `https://your-pwa/.well-known/watch.json`. In Next.js, put it in `public/.well-known/watch.json`.
2. **Register the app** in `proxy/watchbridge.config.ts`:
   ```ts
   { id: "myapp", origin: "https://myapp.vercel.app", authTokenEnv: "MYAPP_TOKEN" /* optional */ }
   ```
   You can also skip the code change with the env var `WATCHBRIDGE_APPS=[{"id":"myapp","origin":"https://myapp.vercel.app"}]`.
3. **Design** in `/preview` until no warnings remain.

If your API needs auth, set `authTokenEnv`. The proxy sends `Authorization: Bearer <value of that env var>`, and the token never reaches the watch.

## Structure

```jsonc
{
  "watchVersion": "1",
  "name": "My App",
  "entry": "home",                       // first screen
  "screens": {
    "home": {
      "title": "Home",
      "tint": "#6366F1",
      "ttl": 30,                         // seconds; data cached this long
      "source": { "url": "/api/summary" },  // same-origin GET (or POST)
      "mode": "template",                // default; or "native"
      "template": [ /* WatchUI nodes with {{bindings}} */ ]
    }
  },
  "actions": {
    "markDone": {
      "url": "/api/items/{{params.id}}/done",
      "method": "POST",                  // POST | PUT | PATCH | DELETE
      "body": { "done": "{{payload.value}}" },   // optional; default = payload as-is
      "message": "Saved",                // optional toast
      "then": "refresh"                  // refresh | pop | none
    }
  },
  "complication": {
    "ttl": 900,
    "source": { "url": "/api/summary" },
    "template": { "text": "{{data.count}} items", "shortText": "{{data.count}}", "symbol": "list.bullet",
                  "gauge": { "value": "{{data.ratio}}", "label": "Done" } }
  }
}
```

### What templates can see

| Name | In screens | In actions | Contains |
|---|---|---|---|
| `data` | ✓ | – | The JSON your `source` returned |
| `params` | ✓ | ✓ | Screen params (from a `navigate` action) |
| `payload` | – | ✓ | What the watch sent (toggles add `value`) |
| `response` | – | ✓ (`message` only) | Your API's response to the action |
| `app` | ✓ | ✓ | `{ id, origin }` |

## Template language

### Bindings

| Template | Result | Rule |
|---|---|---|
| `"{{data.open}}"` | `3` (a number) | A string that is **only** one binding keeps the raw type |
| `"Open: {{data.open}}"` | `"Open: 3"` | Mixed text is always a string |
| `"{{data.tasks.0.title}}"` | first task's title | Dotted paths; numbers index arrays |
| `"/api/x/{{params.id}}"` in a `url` | `/api/x/a%20b` | URLs are **URL-encoded** automatically |

Missing paths become empty (`""`) instead of errors.

### Filters (chain with `|`, arguments with `:`)

| Filter | Example | Output |
|---|---|---|
| `default:'x'` | `{{data.note \| default:'—'}}` | value, or `—` if empty |
| `upper` / `lower` | `{{p \| upper}}` | `HIGH` |
| `truncate:N` | `{{title \| truncate:20}}` | max N chars with `…` |
| `round:N` | `{{4.567 \| round:1}}` | `4.6` |
| `number:N` | `{{12345 \| number}}` | `12,345` |
| `percent:N` | `{{0.42 \| percent}}` | `42%` |
| `len` | `{{data.tasks \| len}}` | array/string length |
| `first` / `last` | `{{data.tasks \| first}}` | first/last item |
| `not` | `{{data.tasks \| len \| not}}` | `true` when empty |
| `eq:x` / `ne:x` | `{{status \| eq:'done'}}` | boolean |
| `gt:x` / `lt:x` | `{{count \| gt:0}}` | boolean |
| `pick:a:b` | `{{done \| pick:'checkmark.circle.fill':'circle'}}` | a if truthy, else b |
| `date` | `{{due \| date}}` | `25 Nov` (UTC) |
| `time` | `{{at \| time}}` | `14:30` (UTC) |
| `json` | `{{obj \| json}}` | JSON string |

**Truthy** means anything except `undefined`, `null`, `false`, `0`, `""`, `"false"`, `NaN`, and an empty array.

### Directives (on objects inside an array)

| Directive | Meaning |
|---|---|
| `"$repeat": "data.tasks", "$as": "task"` | One copy per item; inside it, `task` and `index` are available (max 200) |
| `"$if": "expr"` | Keep only when truthy. With `$repeat`, it is evaluated **per item** (a filter) |
| `"$unless": "expr"` | Keep only when falsy |

Example: list open tasks, or show a message when there are none:

```json
{
  "type": "section", "title": "Open",
  "children": [
    { "$repeat": "data.tasks", "$as": "t", "$if": "t.done | not",
      "type": "row", "title": "{{t.title}}",
      "action": { "type": "navigate", "screen": "detail", "params": { "id": "{{t.id}}" } } },
    { "$if": "data.open | not", "type": "text", "text": "All done 🎉", "style": "footnote" }
  ]
}
```

Repeating chart points works the same way:

```json
{ "type": "chart", "points": [ { "$repeat": "data.history", "$as": "h", "x": "{{h.day}}", "y": "{{h.count}}" } ] }
```

## Native mode (escape hatch)

When the layout is too dynamic for a template, have an endpoint return WatchUI directly:

```json
"about": { "title": "About", "mode": "native", "source": { "url": "/api/watch/about" } }
```
The endpoint returns `{ "body": [ ...WatchUI nodes... ] }`. The sanitizer still runs on it.

## Tips

- **Shape your data for the watch.** If an endpoint returns 2 MB, add a small `/api/watch/summary`; the proxy limit is 1 MB.
- Keep titles short; the screen is about 40 characters wide.
- Use `ttl` generously (30–300 s). The watch shows cached data instantly and revalidates in the background.
- Always open the screen with `?debug=1` or in `/preview`; warnings tell you exactly what was dropped.
