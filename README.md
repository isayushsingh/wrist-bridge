# WristBridge ⌚🌉

**Turn any PWA into a native Apple Watch app.** Add one JSON file to your PWA, and its screens show up on your wrist as real SwiftUI: lists, metrics, gauges, charts, toggles, haptics, offline support, and watch-face complications.

watchOS has no browser and no PWA support. WristBridge doesn't try to shrink a web page onto the watch. Instead it uses **server-driven UI**: a small proxy turns your PWA's existing JSON API into a compact screen description, and a native watch app renders it.

![System context](docs/diagrams/01-system-context.svg)

## How it works in one paragraph

Your PWA publishes `watch.json`, which says "the home screen gets its data from `/api/tasks` and shows each task as a row". The **proxy** (Next.js on Vercel) fetches that data, fills in the template, cleans and shrinks the result, and returns a few KB of **WatchUI** JSON. The **watch app** (SwiftUI) draws it natively. Taps on buttons or toggles go back through the proxy to your API. One watch app works for every PWA.

## Prior art

WristBridge builds on ideas that other projects already use:

- **[DivKit](https://github.com/divkit/divkit)** (Yandex) and **[Nimbus](https://github.com/ZupIT/nimbus)** (ZupIT, archived in 2024) are general server-driven UI frameworks for iOS, Android and the web. You adopt them inside your own app and write layouts for their schema. WristBridge is narrower. It is one prebuilt watch app plus a proxy, and its small schema is designed around the watch's screen size, battery and connectivity. You don't write a layout backend. A PWA adds `watch.json`, and the proxy maps the PWA's existing JSON API onto screens.
- **[Complicator](https://apps.apple.com/us/app/-/id6758154567)** turns a REST endpoint and a JSON path into a watch complication, entirely on the device. WristBridge covers complications too, and it also renders full screens, navigation and write actions such as toggles, deletes and confirmations. The cost is a proxy server that you have to run.
- **[WatchBench](https://appadvice.com/game/app/watchbench/980326989)** (Alpha Software, 2015) let you prototype Apple Watch apps in JavaScript from an iPhone. Its aim was quick prototyping. WristBridge renders native SwiftUI and works from a versioned JSON Schema contract, so it is meant for running real PWAs on the watch.

## Repo layout

```
wristbridge/
├─ CLAUDE.md            ← context for Claude Code (start here when coding)
├─ proxy/               ← Next.js proxy + demo PWA + browser preview (TypeScript)
├─ watch/               ← SwiftUI watchOS app + complication (XcodeGen project.yml)
├─ schema/              ← JSON Schemas (the contract) + real example payloads
└─ docs/                ← documentation + system design diagrams
```

## Quick start

```bash
cd proxy && npm install && npm run dev
# open http://localhost:3000/preview  → click "Demo Tasks"
```

Then follow [docs/02-setup.md](docs/02-setup.md) to deploy to Vercel and run on the watch.

## Documentation

| Doc | What's inside |
|---|---|
| [00 · Start here](docs/00-start-here.md) | Plain-English overview and project status |
| [01 · Architecture](docs/01-architecture.md) | System design, diagrams, design decisions and trade-offs |
| [02 · Setup](docs/02-setup.md) | Local → Vercel → Simulator → real watch, plus troubleshooting |
| [03 · WatchUI schema](docs/03-watchui-schema.md) | The 11 components and 3 actions |
| [04 · watch.json & templates](docs/04-descriptor.md) | Connecting your own PWA; template language reference |
| [05 · HTTP API](docs/05-api.md) | Endpoint reference |
| [06 · Security](docs/06-security.md) | Threat model and mitigations |
| [07 · Watch app internals](docs/07-watch-app.md) | How the Swift side works |
| [08 · Roadmap](docs/08-roadmap.md) | Milestones, resume line, interview talking points |
| [09 · Extending](docs/09-extending.md) | Adding components, filters, actions |
| [10 · Glossary](docs/10-glossary.md) | Every term in easy words |

## Tech

TypeScript · Next.js 16 · Vitest · JSON Schema · Swift · SwiftUI · Swift Charts · WidgetKit · XcodeGen · Vercel

## License

MIT. See [LICENSE](LICENSE).
