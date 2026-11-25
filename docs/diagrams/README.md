# Diagrams

- `src/*.mmd`: the **source** (Mermaid). Edit these.
- `*.svg` / `*.png`: rendered copies used by the docs, so they display anywhere (GitHub, VS Code, Finder, offline).

Re-render after editing:

```bash
npx -y @mermaid-js/mermaid-cli -i docs/diagrams/src/03-pipeline.mmd -o docs/diagrams/03-pipeline.svg -b white
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
