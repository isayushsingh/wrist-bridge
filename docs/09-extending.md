# 09 · Extending WristBridge

## Add a new component (e.g. `badge`)

Touch **six places**, in this order, and keep them in sync:

1. **Schema:** `schema/watchui.v1.schema.json`: add `$defs.badge` and list it in `$defs.node.oneOf`.
2. **TS types:** `proxy/lib/watchui.ts`: add `BadgeNode` and include it in `Node`.
3. **Sanitizer:** `proxy/lib/sanitize.ts`: add a `case "badge"` that coerces fields and returns `undefined` when required fields are missing (with a warning).
4. **Web preview:** `proxy/components/WatchPreview.tsx`: add a case to `NodeView`.
5. **Swift model:** `watch/Shared/Model/WatchUI.swift`: add `BadgeNode`, `case badge(BadgeNode)`, and a decode line.
6. **Swift view:** add `watch/WristBridge/Rendering/Components/BadgeNodeView.swift` and a case in `NodeView.swift`.

Then:
- Add a test in `proxy/tests/sanitize.test.ts`.
- Use it in the demo `watch.json` and regenerate `schema/examples/*.watchui.json` (see `CLAUDE.md`).
- Document it in `docs/03-watchui-schema.md`.
- Run `npm run typecheck && npm test`, then build the watch app.

Adding an optional field to an existing node is the same list, minus the new-case steps.

## Add a template filter

1. Add it to `FILTERS` in `proxy/lib/template.ts`. Filters must be pure, never throw, and handle `undefined`.
2. Add a test in `proxy/tests/template.test.ts`.
3. Add a row to the filters table in `docs/04-descriptor.md`.

## Add an action type (e.g. `openOnPhone`)

1. Add it to the schema (`$defs.action.oneOf`), `watchui.ts` (`Action`), and `sanitizeAction`.
2. Swift: `Action` enum + decoder, then handle it in `ScreenViewModel.handle`.
3. Preview: handle it in `perform()`.

## Add an endpoint

Create `proxy/app/api/v1/.../route.ts` and wrap the handler in `bridgeRoute(...)`, which gives you auth, errors and the debug context. Use `json(data, { req, maxAge })` so ETags work. Never call `fetch` directly; use `fetchAppJSON` / `getAppJSON`.
