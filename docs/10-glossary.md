# 10 · Glossary (easy terms)

| Term | Meaning here |
|---|---|
| **PWA** | Progressive Web App: a website that can be installed like an app (it has a manifest and often works offline). |
| **Web app manifest** | `manifest.webmanifest`: the PWA's name, icon and theme color. The proxy reads it for the app list. |
| **watch.json / descriptor** | The file your PWA adds to describe its watch screens. See [04](04-descriptor.md). |
| **WatchUI** | This project's JSON format for describing a watch screen. See [03](03-watchui-schema.md). |
| **Node** | One building block in a WatchUI screen (text, row, gauge, …). |
| **Server-driven UI (SDUI)** | The server decides *what* is on screen, and the app only knows *how* to draw each block. |
| **Proxy** | A server that sits between two others and talks to each on the other's behalf. Here: watch ↔ proxy ↔ PWA. |
| **Template / binding** | `"{{data.open}}"`: a placeholder filled with real data at request time. |
| **Filter** | A tiny transform inside a binding: `{{0.4 \| percent}}` → `40%`. |
| **Sanitizer** | Code that cleans JSON before it is sent: fixes types, removes broken pieces, enforces size limits. |
| **TTL** | Time To Live: how many seconds something stays fresh in a cache. |
| **ETag** | A fingerprint of a response. If the watch's fingerprint matches, the server replies `304 Not Modified` with no body, which saves battery and data. |
| **304** | The HTTP status meaning "you already have the latest copy". |
| **SSRF** | Server-Side Request Forgery: tricking a server into fetching URLs it shouldn't. Blocked by the same-origin rule. |
| **Origin** | Scheme + host + port, e.g. `https://myapp.vercel.app`. "Same origin" means exactly that one. |
| **Route handler** | A Next.js file (`route.ts`) that answers HTTP requests. On Vercel, each runs as a serverless function. |
| **Serverless** | Code that runs on demand without you managing servers. Each instance can start "cold" with empty memory. |
| **SwiftUI** | Apple's declarative UI framework: you describe the view, and the system draws and updates it. |
| **@Observable** | Swift macro that makes a class's changes automatically refresh the views that use it. |
| **Environment (SwiftUI)** | Values passed implicitly down the view tree. Used here to hand buttons the action handler. |
| **Codable / Decodable** | Swift's built-in JSON ↔ struct conversion. |
| **Complication** | A small widget on the watch face. Built with WidgetKit. |
| **WidgetKit timeline** | The list of widget states plus when to ask for the next one. watchOS limits how often that can happen. |
| **SF Symbols** | Apple's built-in icon set, referenced by name (`checkmark.circle.fill`). |
| **XcodeGen** | Tool that generates an `.xcodeproj` from a readable `project.yml`. |
| **.xcconfig** | Plain-text build settings file for Xcode. `//` starts a comment, hence the `$()` trick in URLs. |
| **Haptic** | A vibration tap on the wrist (success / failure / click). |
| **Optimistic UI** | Show the change immediately, then confirm with the server. |
| **Forward compatibility** | Old app versions keep working when the server sends newer data (unknown nodes become placeholders). |
| **JSON Schema** | A standard way to formally describe what valid JSON looks like; the tests use it as the contract. |
