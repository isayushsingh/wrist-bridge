# 02 · Setup guide

The path below goes from cheapest to most involved: **browser → watch simulator → your real watch**.

## Prerequisites

| Need | For | Cost |
|---|---|---|
| Node.js 20+ | Proxy | Free |
| A Mac with Xcode 16 or newer | Watch app | Free |
| Homebrew + XcodeGen (`brew install xcodegen`) | Generating the Xcode project | Free |
| A Vercel account | Hosting the proxy | Free (Hobby) |
| An Apple ID | Installing on your own watch | Free (7-day installs) |

---

## Step 1: Run the proxy locally (about 5 min)

```bash
cd proxy
npm install
cp .env.example .env.local     # leave BRIDGE_API_KEY empty for local dev
npm run dev                    # http://localhost:3000
```

Then check it:
- `http://localhost:3000`: the landing page
- `http://localhost:3000/preview`: **the watch preview**. Click "Demo Tasks", open a task, toggle it, delete it.
- `http://localhost:3000/api/v1/apps/demo/screens/home?debug=1`: the raw JSON the watch receives

Run the checks:
```bash
npm run typecheck && npm test
BASE=http://localhost:3000 npm run smoke     # with the dev server running
```

## Step 2: Deploy the proxy to Vercel (about 10 min)

1. Push the repo to GitHub.
2. In Vercel, choose **Add New → Project**, import the repo, and set **Root Directory = `proxy`**. The framework is detected as Next.js.
3. Under **Environment Variables**, add `BRIDGE_API_KEY` = a long random string (`openssl rand -hex 24`).
4. Deploy, then open `https://<your-project>.vercel.app/api/v1/health`. It should return `"auth": true`.
5. Check with the key:
   ```bash
   BASE=https://<your-project>.vercel.app KEY=<your key> npm run smoke
   ```

> **Gotcha:** Vercel's *Deployment Protection* (Vercel Authentication) can block requests to **preview** deployments, including the proxy's call to its own `/demo` routes. Use the **production** domain, or turn protection off for previews.

## Step 3: Run the watch app in the Simulator (about 15 min)

```bash
cd watch
cp Config/Secrets.example.xcconfig Config/Secrets.xcconfig
# edit Secrets.xcconfig:
#   DEVELOPMENT_TEAM  = your team id (Xcode → Settings → Accounts → your Apple ID)
#   BUNDLE_ID_PREFIX  = com.<yourname>.wristbridge
#   For the simulator + local proxy keep:  BRIDGE_BASE_URL = http:/$()/localhost:3000
xcodegen generate
open WristBridge.xcodeproj
```

In Xcode, choose the **WristBridge** scheme and an **Apple Watch simulator**, then press **Run (⌘R)**. The simulator reaches your Mac's `localhost`, so keep `npm run dev` running.

> **Why `http:/$()/localhost`?** In `.xcconfig` files, `//` starts a comment. `$()` expands to nothing, so the value becomes `http://localhost:3000`.

### First build will likely need small fixes

The Swift code was written and syntax-checked without access to Xcode, so it has never been compiled. If Xcode shows errors, open the project in Claude Code and paste them in. `CLAUDE.md` tells it what to do.

## Step 4: Install on your real Apple Watch

1. Point the app at your deployed proxy in `Secrets.xcconfig`:
   ```
   BRIDGE_BASE_URL = https:/$()/<your-project>.vercel.app
   BRIDGE_API_KEY  = <same key as on Vercel>
   ```
   A real watch needs **HTTPS**. It can't reach your Mac's localhost.
2. `xcodegen generate` (needed after editing xcconfig or `project.yml`).
3. On the iPhone paired with the watch, enable **Developer Mode** (Settings → Privacy & Security), and on the watch too if prompted.
4. Connect the iPhone to the Mac. In Xcode, pick your **watch** as the run destination and press Run. The first install can take several minutes.
5. With a free Apple ID the app stops launching after **7 days**; press Run again to reinstall it.

### Add the complication
Long-press the watch face → **Edit** → **Complications** → choose **WristBridge**. It shows the app set in `BRIDGE_COMPLICATION_APP`.

## Step 5: Connect your own PWA

See [04 · watch.json and templates](04-descriptor.md). In short:
1. Add `public/.well-known/watch.json` to your PWA.
2. Register it in `proxy/watchbridge.config.ts` (or the `WATCHBRIDGE_APPS` env var).
3. Design the screens in `/preview` until there are no warnings.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Watch shows "Wrong bridge key" | `BRIDGE_API_KEY` differs between Vercel and `Secrets.xcconfig` | Make them identical, `xcodegen generate`, rebuild |
| Watch shows a network error in the simulator | Proxy not running, or wrong `BRIDGE_BASE_URL` | Run `npm run dev`; check the `$()` trick |
| Works in the simulator, not on the real watch | Real watch can't reach `localhost` / uses HTTP | Use the Vercel HTTPS URL |
| App list empty | Every app's `watch.json` failed to load | Open `/api/v1/apps?debug=1` and read `warnings` |
| `outside the registered origin` error | A `source`/action URL points to another host | Use a path on the same origin (see [06](06-security.md)) |
| A component is missing on screen | Sanitizer dropped it | Open the screen with `?debug=1` or in `/preview` and read the warnings |
| Complication says "No data" | Wrong `BRIDGE_COMPLICATION_APP`, or no `complication` in watch.json | Fix the id; add a complication block |
| Xcode: signing error | No team / bundle id taken | Set `DEVELOPMENT_TEAM` and a unique `BUNDLE_ID_PREFIX` |
