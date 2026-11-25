# 07 · Watch app internals

## Targets

| Target | Type | Sources | Purpose |
|---|---|---|---|
| `WristBridge` | watchOS app (watch-only, single target) | `WristBridge/` + `Shared/` | The app |
| `WristBridgeWidget` | WidgetKit extension, embedded in the app | `WristBridgeWidget/` + `Shared/` | Complications |

The Xcode project is **generated** from `project.yml` with XcodeGen. Build settings come from `Config/Base.xcconfig`, overridden by your git-ignored `Config/Secrets.xcconfig`. The values reach Swift through Info.plist keys (`BRIDGE_BASE_URL`, `BRIDGE_API_KEY`, `BRIDGE_COMPLICATION_APP`) → `AppConfig`.

Minimum is **watchOS 10**, which brings `@Observable`, `NavigationStack`, toolbar placements, and widget container backgrounds.

## How a screen gets on your wrist

```
WristBridgeApp
 └─ NavigationStack(path: navigator.path)
     ├─ AppListView                 GET /apps  → tap → navigator.push(Route)
     └─ ScreenView(route)           one per pushed Route
         ├─ ScreenViewModel         load(), handle(action), run(call)
         │    └─ BridgeClient       GET /screens/:id  (ETag + disk cache)
         └─ DocumentView            List { sections + rows }
              └─ NodeView           switch node.type → Components/*
                   └─ buttons/rows call @Environment(\.watchAction)
```

### Key ideas, in plain words

- **Route**: "which app, which screen, which params". The navigation stack is just an array of these.
- **Navigator**: a shared object any screen can ask to push or pop. It's how `then: "pop"` works.
- **ActionHandler in the environment**: a deeply nested button doesn't know about networking. It calls `watchAction(action)`, and the nearest `ScreenView` decides what to do.
- **LoadState**: `loading` → `loaded(doc, isStale)` or `failed(message)`. Once loaded, later errors show as a toast instead of wiping the screen.
- **Toggles are optimistic**: the switch flips instantly, the action runs, the screen reloads, and `.id(label-isOn)` resets the toggle to the server's truth.
- **Tolerant decoding**: `Node` decodes unknown or broken nodes into `.unsupported(type)`, so one bad node never breaks a screen.

## Networking and cache (`Shared/Networking`)

| Situation | Behaviour |
|---|---|
| First load | `GET` → 200 → decode → save `{data, etag}` to Caches |
| Repeat load, unchanged | `If-None-Match` → **304** (empty body) → decode the saved copy |
| Repeat load, changed | 200 → replace the saved copy |
| No network / timeout | Saved copy shown with "Offline: showing saved copy"; with no saved copy, the error view and Try again |
| HTTP error (401/404/5xx) | The error `message` from the proxy is shown |

The cache keeps the newest 60 responses, keyed by a SHA-256 of the URL.

## Complications (`WristBridgeWidget`)

- `ComplicationProvider` fetches `/apps/:id/complication` and schedules the next reload after `ttl` (≥ 5 min; watchOS rations reloads).
- After any successful action, the app calls `WidgetCenter.shared.reloadAllTimelines()`.
- Families: **circular** (gauge + short text), **rectangular** (text + linear gauge), **inline** (text), **corner** (symbol + label).
- No App Group is used, so it works with a free Apple ID. The trade-off is that the widget does its own network call.

## Where to change things

| I want to… | Edit |
|---|---|
| Change how rows look | `Rendering/Components/RowNodeView.swift` |
| Map a new text style | `Tokens.font` in `Rendering/NodeView.swift` |
| Add a component | [09 · Extending](09-extending.md) checklist |
| Change cache size | `ResponseCache.maxEntries` |
| Change request timeout | `BridgeClient` (`timeoutInterval: 15`) |
| Add a setting | `Config/Base.xcconfig` → `project.yml` Info.plist properties → `AppConfig` |
