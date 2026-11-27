# Diagrams

- `src/*.mmd`: the **source** (Mermaid). Edit these.
- `*.png`: rendered copies **embedded in the docs**. Use PNG in Markdown: Mermaid SVGs draw labels with `<foreignObject>`, which many viewers (VS Code preview, some GitHub views) refuse to render inside `<img>` ("Invalid image source").
- `*.svg`: vector copies for zooming or slides; not embedded.

The landing page (`proxy/app/page.tsx`) shows copies of the PNGs from `proxy/public/diagrams/`. `npm run dev` and `npm run build` refresh them automatically (`proxy/scripts/sync-diagrams.mjs`); commit the copies too, because a Vercel build may not see `docs/`.

Re-render **both** after editing:

```bash
npx -y @mermaid-js/mermaid-cli -i docs/diagrams/src/03-pipeline.mmd -o docs/diagrams/03-pipeline.svg -b white
npx -y @mermaid-js/mermaid-cli -i docs/diagrams/src/03-pipeline.mmd -o docs/diagrams/03-pipeline.png -b white -s 2
```

| File | Shows |
|---|---|
| 01-system-context | Who talks to whom |
| 02-components | Files/modules inside the proxy and the watch app |
| 03-pipeline | How a screen request becomes WatchUI JSON |
| 04-seq-open-screen | Opening a screen, including the ETag/304 path |
| 05-seq-action | Running an action (confirm → call → haptic → pop) |
| 06-seq-offline | What happens without network |
| 07-screen-states | Screen state machine on the watch |
| 08-deployment | Local dev vs. real use |
