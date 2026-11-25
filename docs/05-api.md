# 05 · HTTP API reference (proxy)

Base URL: your Vercel deployment, e.g. `https://wristbridge-proxy.vercel.app`.

**Auth:** when `BRIDGE_API_KEY` is set, every `/api/v1/apps*` request needs the header `x-bridge-key: <key>`. A missing or wrong key returns `401`.

**Errors:** non-2xx responses always look like
```json
{ "error": { "code": "not_found", "message": "Screen \"nope\" not found" } }
```
The watch shows `message` to the user.

**Debug:** add `?debug=1` to include `warnings` (from the template engine and sanitizer) in the response.

**Caching:** GET responses carry `ETag` and `Cache-Control: private, max-age=<ttl>`. Send `If-None-Match` to receive an empty `304` when nothing changed.

---

### `GET /api/v1/health`
No auth required. Returns `{ "ok": true, "service": "wristbridge-proxy", "schemaVersion": "1", "auth": true }`.

### `GET /api/v1/apps`
Lists the apps whose `watch.json` loaded. Apps that fail to load are skipped (see `warnings` with `?debug=1`).
```json
{ "apps": [ { "id": "demo", "name": "Demo Tasks", "shortName": "Tasks",
              "themeColor": "#6366F1", "icon": "https://…/demo/icon-192.png", "entry": "home" } ] }
```

### `GET /api/v1/apps/:appId/screens/:screenId?<params>`
Renders one screen. Every query parameter except `debug` becomes `params`.
Returns a [WatchUI document](03-watchui-schema.md). Example: [`schema/examples/home.watchui.json`](../schema/examples/home.watchui.json).

| Status | When |
|---|---|
| 200 / 304 | OK |
| 401 | Bad key |
| 403 | A source URL left the app's origin |
| 404 | Unknown app/screen, or the source returned 404 |
| 502 | `watch.json` invalid, upstream error, non-JSON response, or response > 1 MB |
| 504 | Upstream timed out (8 s) or unreachable |

### `POST /api/v1/apps/:appId/actions/:actionId`
Body:
```json
{ "payload": { "value": true }, "params": { "id": "3" } }
```
Response (always 200 when the proxy itself worked; check `ok`):
```json
{ "ok": true, "message": "Marked done", "then": "refresh" }
{ "ok": false, "message": "Task not found" }
```
After any action, the proxy drops its cached data for that app, so the next refresh is fresh.

### `GET /api/v1/apps/:appId/complication`
```json
{ "text": "2 open · 60% done", "shortText": "2", "symbol": "checklist",
  "tint": "#6366F1", "gauge": { "value": 0.6, "label": "Done" }, "ttl": 900 }
```
`gauge.value` is always clamped to 0…1, and `ttl` is at least 300 seconds (watchOS limits how often widgets reload).

---

### Demo PWA endpoints (stand-ins for *your* API)

| Method | Path | Purpose |
|---|---|---|
| GET | `/demo/watch.json` | Descriptor |
| GET | `/demo/manifest.webmanifest` | Manifest |
| GET / POST | `/demo/api/tasks` | Summary / add `{ title }` |
| GET / DELETE | `/demo/api/tasks/:id` | One task / delete |
| POST | `/demo/api/tasks/:id/toggle` | `{ done?: boolean }` |
| GET | `/demo/api/about` | Native-mode example |

Demo data is in memory and resets when the server restarts.
