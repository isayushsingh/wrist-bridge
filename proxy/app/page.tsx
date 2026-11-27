import Link from "next/link";
import WatchPreview from "@/components/WatchPreview";
import { DiagramTabs, Reveal, Stepper } from "@/components/landing/Interactive";
import { allRegistrations } from "@/lib/registry";
import { LIMITS } from "@/lib/sanitize";
import "./landing.css";

export const dynamic = "force-dynamic";

const GITHUB = "https://github.com/isayushsingh/wrist-bridge";

// Real snippets: the demo's watch.json row template, one record from its API, and the proxy's output
// (schema/examples/demo.watch.json and home.watchui.json).
const TEMPLATE = `{
  "$repeat": "data.tasks", "$as": "task",
  "type": "row",
  "title": "{{task.title}}",
  "subtitle": "Due {{task.due | date}} · {{task.priority | upper}}",
  "icon": "{{task.done | pick:'checkmark.circle.fill':'circle'}}",
  "action": { "type": "navigate", "screen": "detail",
              "params": { "id": "{{task.id}}" } }
}`;

const DATA = `{
  "id": "3",
  "title": "Answer-writing: 2 questions",
  "done": false,
  "due": "2026-11-26T00:00:00.000Z",
  "priority": "high"
}`;

const OUTPUT = `{
  "type": "row",
  "title": "Answer-writing: 2 questions",
  "subtitle": "Due 26 Nov · HIGH",
  "icon": "circle",
  "action": { "type": "navigate", "screen": "detail",
              "params": { "id": "3" } }
}`;

const PIPELINE = [
  {
    title: "Look up",
    body: "The watch asks for a screen. The proxy finds it in the PWA's watch.json (cached for 5 minutes).",
    code: `GET /api/v1/apps/demo/screens/home\n→ screens.home in /demo/watch.json`,
  },
  {
    title: "Fetch",
    body: "It calls the PWA's existing JSON API. Same origin only, 8 s timeout, 1 MB cap, no redirects: the proxy can't be turned against other hosts.",
    code: `source: { "url": "/demo/api/tasks" }\n→ GET https://<pwa>/demo/api/tasks`,
  },
  {
    title: "Render",
    body: "A tiny template language fills the screen: {{bindings}}, filters like date and percent, $repeat and $if.",
    code: `"{{task.due | date}}"  →  "26 Nov"\n"{{data.progress | percent}}"  →  "60%"`,
  },
  {
    title: "Sanitize",
    body: `Types are coerced and bad nodes are dropped with a warning, never a crash. Budgets keep it watch-sized: ${LIMITS.maxNodes} nodes, depth ${LIMITS.maxDepth}, ${LIMITS.maxPoints} chart points.`,
    code: `"0.4" → 0.4\n{ "type": "marquee" } → dropped + warning`,
  },
  {
    title: "Respond",
    body: "A few KB of WatchUI JSON with an ETag. When nothing changed, the watch gets a 304 and redraws from its cache.",
    code: `200 OK  ETag: "q9V…"  (≈1–4 KB)\n304 Not Modified       (0 bytes body)`,
  },
];

const TAP_FLOW = [
  { who: "Watch", what: "Tap the Done toggle" },
  { who: "Proxy", what: "POST actions/toggleTask" },
  { who: "PWA", what: "POST /api/tasks/3/toggle" },
  { who: "Watch", what: "Haptic + “Marked done”" },
  { who: "Watch", what: "Screen refreshes" },
];

const DECISIONS = [
  {
    title: "Server-driven UI",
    why: "One watch app serves every PWA, and screens change without reinstalling — key when free installs expire every 7 days.",
    cost: "Layouts are limited to what the schema can express.",
  },
  {
    title: "A proxy in the middle",
    why: "Shrinks payloads for a slow, battery-bound device, caches, keeps API tokens off the watch, and enforces one schema.",
    cost: "One more hop and one more service to deploy.",
  },
  {
    title: "Sanitize, don't reject",
    why: "One bad node shouldn't blank a whole screen on your wrist. Problems surface as warnings in ?debug=1.",
    cost: "Bugs can hide unless you read the warnings.",
  },
  {
    title: "Tolerant decoding",
    why: "Unknown components become a placeholder, so an old watch build keeps working when the schema grows.",
    cost: "Users may see “update the app to see this”.",
  },
  {
    title: "ETag + disk cache",
    why: "Repeat views cost almost nothing, and the last good screen still shows offline.",
    cost: "Offline data can be stale, so it's labelled.",
  },
  {
    title: "Same-origin fetch only",
    why: "Stops the proxy being abused to reach internal or third-party hosts (SSRF).",
    cost: "An API on another origin needs its own registration.",
  },
];

const DIAGRAMS = [
  { file: "01-system-context.png", title: "System", caption: "Who talks to whom: watch app and complication → proxy → your PWA." },
  { file: "02-components.png", title: "Components", caption: "Modules inside the proxy and the watch app." },
  { file: "03-pipeline.png", title: "Pipeline", caption: "How a screen request becomes WatchUI JSON." },
  { file: "04-seq-open-screen.png", title: "Open screen", caption: "Opening a screen, including the ETag / 304 path." },
  { file: "05-seq-action.png", title: "Action", caption: "Confirm → call → haptic → refresh or pop." },
  { file: "06-seq-offline.png", title: "Offline", caption: "What the watch shows without a network." },
  { file: "07-screen-states.png", title: "States", caption: "The screen state machine on the watch." },
  { file: "08-deployment.png", title: "Deploy", caption: "Local development vs. real use on Vercel." },
];

const STACK = ["TypeScript", "Next.js 16", "Vercel", "Vitest", "JSON Schema", "Swift", "SwiftUI", "Swift Charts", "WidgetKit", "XcodeGen"];

export default function Home() {
  const apps = allRegistrations();
  return (
    <div className="lp">
      <nav className="nav">
        <span className="brand">⌚ WristBridge</span>
        <span className="navlinks">
          <a href="#problem">Problem</a>
          <a href="#how">How it works</a>
          <a href="#design">Design</a>
          <a href="#try">Try it</a>
          <a href={GITHUB}>GitHub</a>
        </span>
      </nav>

      {/* ---------- hero ---------- */}
      <header className="hero">
        <div className="herotext">
          <p className="eyebrow">Server-driven UI for Apple Watch</p>
          <h1>
            Your web app,
            <br />
            <span className="grad">on your wrist.</span>
          </h1>
          <p className="lede">
            WristBridge turns any Progressive Web App into a <strong>native</strong> Apple Watch app. The PWA adds one
            JSON file. No Swift, no rewrite, no second codebase.
          </p>
          <div className="ctas">
            <a className="btn primary" href="#try">Try the live demo</a>
            <a className="btn" href="#how">See how it works</a>
          </div>
          <ul className="chips">
            <li><b>1</b> watch app for every PWA</li>
            <li><b>1–4 KB</b> per screen</li>
            <li><b>0</b> lines of Swift per app</li>
          </ul>
        </div>
        <div className="herowatch">
          <div className="orbit" aria-hidden />
          <div className="mock">
            <div className="mockscreen">
              <div className="mtitle">Tasks</div>
              <div className="mrow m1"><span className="dot" />Revise GS2 polity notes</div>
              <div className="mrow m2"><span className="dot ok" />10 km easy run</div>
              <div className="mrow m3"><span className="dot" />Answer-writing: 2 qs</div>
              <div className="mgauge"><div /></div>
            </div>
          </div>
          <div className="floatcard f1">{`{ "type": "row" }`}</div>
          <div className="floatcard f2">{`{ "type": "gauge" }`}</div>
          <div className="floatcard f3">{`{ "type": "chart" }`}</div>
        </div>
      </header>

      {/* ---------- problem ---------- */}
      <section id="problem" className="band">
        <Reveal>
          <p className="eyebrow">The problem</p>
          <h2>The watch has no browser.</h2>
          <p className="sub">
            watchOS can&apos;t run websites or PWAs at all. A real browser engine needs HTML, CSS layout and a JIT-compiled
            JavaScript engine — and watchOS forbids JIT and has tight memory limits.
          </p>
        </Reveal>
        <div className="problem">
          <Reveal className="bounce-scene">
            <div className="pwa-card">
              <span className="pwa-icon">◎</span>
              <span>your-pwa.app</span>
            </div>
            <div className="mini-watch">
              <span className="nope">✕</span>
            </div>
            <p className="caption">A PWA can&apos;t install on watchOS.</p>
          </Reveal>
          <div className="cards3">
            <Reveal delay={0} className="card">
              <h3>Native means a second app</h3>
              <p>Swift, SwiftUI, Xcode and Apple&apos;s toolchain — a separate codebase that web developers don&apos;t have.</p>
            </Reveal>
            <Reveal delay={120} className="card">
              <h3>Your data already exists</h3>
              <p>Most PWAs already serve their screens from a JSON API. The watch just can&apos;t use it.</p>
            </Reveal>
            <Reveal delay={240} className="card">
              <h3>The watch is tiny</h3>
              <p>Slow CPU, small battery, flaky network. Whatever runs there must be small and native.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- idea ---------- */}
      <section className="band">
        <Reveal>
          <p className="eyebrow">The idea</p>
          <h2>Send a description, not a website.</h2>
          <p className="sub">
            The phone-sized web stays on a server. The watch receives a few KB of layout instructions and draws them with
            real SwiftUI — the same reason Apple&apos;s own watch apps are native.
          </p>
        </Reveal>
        <Reveal className="compare">
          <div className="cmp web">
            <h4>A web page</h4>
            <div className="meter"><div className="fill big" /></div>
            <p>HTML + CSS + JavaScript + a browser engine to run it</p>
          </div>
          <div className="cmp wui">
            <h4>A WatchUI screen</h4>
            <div className="meter"><div className="fill small" /></div>
            <p>~2 KB of JSON, drawn natively: lists, gauges, charts, toggles, haptics</p>
          </div>
        </Reveal>
      </section>

      {/* ---------- how ---------- */}
      <section id="how" className="band">
        <Reveal>
          <p className="eyebrow">How it works</p>
          <h2>Three parts, one file to connect them.</h2>
        </Reveal>
        <Reveal className="arch">
          <svg viewBox="0 0 960 250" role="img" aria-label="Watch app talks to the proxy, which talks to your PWA">
            <defs>
              <linearGradient id="g1" x1="0" x2="1">
                <stop offset="0" stopColor="#6366f1" />
                <stop offset="1" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <path id="p-req1" d="M210 105 H380" className="wire" />
            <path id="p-req2" d="M580 105 H750" className="wire" />
            <path id="p-res2" d="M750 150 H580" className="wire" />
            <path id="p-res1" d="M380 150 H210" className="wire" />

            <g className="node">
              <rect x="30" y="60" width="180" height="130" rx="22" />
              <text x="120" y="112" className="t1">⌚ Watch app</text>
              <text x="120" y="138" className="t2">SwiftUI renderer</text>
              <text x="120" y="158" className="t2">+ complication</text>
            </g>
            <g className="node hub">
              <rect x="380" y="45" width="200" height="160" rx="22" />
              <text x="480" y="100" className="t1">Proxy</text>
              <text x="480" y="126" className="t2">Next.js on Vercel</text>
              <text x="480" y="148" className="t2">template · sanitize</text>
              <text x="480" y="168" className="t2">cache · ETag</text>
            </g>
            <g className="node">
              <rect x="750" y="60" width="180" height="130" rx="22" />
              <text x="840" y="112" className="t1">Your PWA</text>
              <text x="840" y="138" className="t2">JSON API</text>
              <text x="840" y="158" className="t2">+ watch.json</text>
            </g>

            <text x="295" y="93" className="t3">GET screen</text>
            <text x="665" y="93" className="t3">GET /api/…</text>
            <text x="665" y="175" className="t3">your JSON</text>
            <text x="295" y="175" className="t3">WatchUI · 2 KB</text>

            <circle r="6" className="packet req">
              <animateMotion dur="3.2s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.25;1" calcMode="linear">
                <mpath href="#p-req1" />
              </animateMotion>
            </circle>
            <circle r="6" className="packet req">
              <animateMotion dur="3.2s" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;0.25;0.5;1" calcMode="linear">
                <mpath href="#p-req2" />
              </animateMotion>
            </circle>
            <circle r="7" className="packet res">
              <animateMotion dur="3.2s" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;0.5;0.75;1" calcMode="linear">
                <mpath href="#p-res2" />
              </animateMotion>
            </circle>
            <circle r="5" className="packet out">
              <animateMotion dur="3.2s" repeatCount="indefinite" keyPoints="0;0;1" keyTimes="0;0.75;1" calcMode="linear">
                <mpath href="#p-res1" />
              </animateMotion>
            </circle>
          </svg>
        </Reveal>

        <div className="threecode">
          <Reveal className="codecard" delay={0}>
            <h4><span className="tag">1</span> watch.json template</h4>
            <pre className="code">{TEMPLATE}</pre>
          </Reveal>
          <Reveal className="codecard" delay={150}>
            <h4><span className="tag">2</span> + your API&apos;s data</h4>
            <pre className="code">{DATA}</pre>
          </Reveal>
          <Reveal className="codecard out" delay={300}>
            <h4><span className="tag">3</span> = WatchUI for the watch</h4>
            <pre className="code">{OUTPUT}</pre>
          </Reveal>
        </div>
        <p className="note">Real snippets from the demo app. The PWA&apos;s own code doesn&apos;t change.</p>

        <Reveal>
          <h3 className="h3">The render pipeline</h3>
          <Stepper steps={PIPELINE} />
        </Reveal>

        <Reveal>
          <h3 className="h3">A tap, round trip</h3>
          <ol className="tapflow">
            {TAP_FLOW.map((s, i) => (
              <li key={i} style={{ animationDelay: `${i * 0.6}s` }}>
                <span className={`who who-${s.who.toLowerCase()}`}>{s.who}</span>
                <span>{s.what}</span>
              </li>
            ))}
          </ol>
          <p className="note">Destructive actions ask for confirmation first; the action decides whether to refresh or go back.</p>
        </Reveal>
      </section>

      {/* ---------- design ---------- */}
      <section id="design" className="band">
        <Reveal>
          <p className="eyebrow">Design decisions</p>
          <h2>Built for a slow, small, offline-prone device.</h2>
          <p className="sub">Every choice has a trade-off. Hover or tap a card to see it.</p>
        </Reveal>
        <div className="decisions">
          {DECISIONS.map((d, i) => (
            <Reveal key={d.title} delay={i * 80} className="flip">
              <div className="flipinner" tabIndex={0}>
                <div className="face front">
                  <span className="dnum">D{i + 1}</span>
                  <h3>{d.title}</h3>
                  <p>{d.why}</p>
                </div>
                <div className="face back">
                  <span className="dnum">Trade-off</span>
                  <p>{d.cost}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="stats">
          <div><b>11</b><span>UI components</span></div>
          <div><b>3</b><span>action types</span></div>
          <div><b>24</b><span>automated tests</span></div>
          <div><b>{LIMITS.maxNodes}</b><span>node budget per screen</span></div>
          <div><b>8 s · 1 MB</b><span>fetch timeout · cap</span></div>
          <div><b>0</b><span>databases</span></div>
        </Reveal>
      </section>

      {/* ---------- try ---------- */}
      <section id="try" className="band trysec">
        <div className="trygrid">
          <Reveal>
            <p className="eyebrow">Try it</p>
            <h2>This watch is live.</h2>
            <p className="sub">
              It&apos;s the browser version of the watch renderer, calling this deployment&apos;s real API. Open{" "}
              <b>Tasks</b>, tap a task, flip <b>Done</b>, or delete it. Or open <b>WristPlan</b>, my own gym plan, connected
              by adding one <code>watch.json</code> to a static site.
            </p>
            <ul className="ticks">
              <li>Same components and actions as the SwiftUI app</li>
              <li>Demo data resets on its own; have fun</li>
              <li>
                Want the details? <Link href="/preview">Full preview with JSON and warnings</Link>
              </li>
            </ul>
          </Reveal>
          <Reveal className="livewatch">
            <WatchPreview embed />
          </Reveal>
        </div>
      </section>

      {/* ---------- docs ---------- */}
      <section className="band">
        <Reveal>
          <p className="eyebrow">Architecture</p>
          <h2>The diagrams from the docs.</h2>
          <p className="sub">
            Generated from Mermaid sources in the repo. Click to open full size, or read the{" "}
            <a href={`${GITHUB}/blob/main/docs/01-architecture.md`}>architecture doc</a>.
          </p>
        </Reveal>
        <Reveal>
          <DiagramTabs diagrams={DIAGRAMS} />
        </Reveal>
      </section>

      {/* ---------- stack + status ---------- */}
      <section className="band">
        <div className="twocol">
          <Reveal>
            <p className="eyebrow">Stack</p>
            <ul className="stack-chips">{STACK.map((s) => <li key={s}>{s}</li>)}</ul>
          </Reveal>
          <Reveal>
            <p className="eyebrow">Status &amp; next</p>
            <ul className="status">
              <li className="ok">Proxy: tested against a JSON Schema contract, deployed on Vercel</li>
              <li className="ok">Watch app: compiles cleanly, runs in the watchOS simulator</li>
              <li className="next">Next: real-watch install, per-user sign-in, push updates</li>
            </ul>
          </Reveal>
        </div>
      </section>

      <footer className="foot">
        <div>
          <span className="brand">⌚ WristBridge</span>
          <span className="muted"> · built by Ayush Singh · <a href={GITHUB}>GitHub</a></span>
        </div>
        <details>
          <summary>Developer links</summary>
          <ul className="links">
            <li><Link href="/preview">Watch preview</Link>: render any screen in the browser</li>
            <li><Link href="/demo">Demo PWA</Link>: the sample app the proxy talks to</li>
            <li><a href="/api/v1/health">/api/v1/health</a>: liveness check</li>
          </ul>
          <p className="muted">Registered apps:</p>
          <ul>
            {apps.map((a) => (
              <li key={a.id}>
                <code>{a.id}</code> → {a.origin === "self" ? "this deployment" : a.origin}
              </li>
            ))}
          </ul>
        </details>
      </footer>
    </div>
  );
}
