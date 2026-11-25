# 06 · Security model

The proxy is a public URL that fetches other URLs, which makes it a natural target. These are the threats it is designed against.

| Threat | What could happen | Mitigation | Where |
|---|---|---|---|
| **Anyone calls your proxy** | Strangers read your app data or trigger actions | Shared secret `x-bridge-key`, compared in constant time; set `BRIDGE_API_KEY` on Vercel | `lib/handler.ts` |
| **SSRF** (proxy used to reach other hosts) | `watch.json` or params point the proxy at `http://169.254.169.254/` or someone else's API | Every outbound URL is resolved against the app origin and **rejected if the origin differs**; redirects are not followed | `lib/http.ts` |
| **Param injection into URLs** | `id = "../admin"` changes the path | Values interpolated into URLs are `encodeURIComponent`-ed | `lib/template.ts` (`interpolateUrl`) |
| **Huge or slow upstreams** | A function hangs or runs out of memory, and the Vercel bill grows | 8 s timeout, 1 MB response cap, 200-item repeat cap, node budgets | `lib/http.ts`, `lib/template.ts`, `lib/sanitize.ts` |
| **Leaking app tokens** | Your PWA's API token ends up on the watch or in logs | Tokens live only in Vercel env vars (`authTokenEnv`) and are added server-side | `lib/http.ts` |
| **Unregistered apps** | Proxy talks to arbitrary origins | Only apps in `watchbridge.config.ts` / `WATCHBRIDGE_APPS` exist; ids are validated | `lib/registry.ts` |
| **Malicious content** | Script URLs or odd schemes in images | Only `http(s)` image URLs; the watch renders native views, so there is no HTML or JS execution at all | `lib/sanitize.ts` |
| **Accidental destructive taps** | Wrist bumps delete things | `confirm` on call actions shows an alert first | watch `ScreenView` |

## Known limitations (v1)

- **One shared key** for all your devices. If it leaks, rotate it on Vercel and in `Secrets.xcconfig`. Per-device tokens are on the [roadmap](08-roadmap.md).
- The key is compiled into the watch app's Info.plist, which is fine for a personal app. For a public App Store release, switch to per-user auth such as Sign in with Apple.
- No rate limiting. Vercel's platform limits apply; add Upstash rate-limit if you make it public.
- `NSAllowsLocalNetworking` is enabled so the simulator can reach `http://localhost`. All other traffic must be HTTPS (App Transport Security).
