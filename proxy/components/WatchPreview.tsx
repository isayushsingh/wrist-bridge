"use client";

/**
 * Browser approximation of the SwiftUI renderer in watch/WristBridge/Rendering.
 * Same node types, same action behaviour (navigate pushes, call posts then refreshes/pops).
 * It is a design aid, not pixel-perfect.
 */
import { useCallback, useEffect, useState } from "react";
import type { Action, AppInfo, CallAction, Node, WatchDocument } from "@/lib/watchui";

type Route = { appId: string; screen: string; params: Record<string, string>; tint?: string };
type Loaded = WatchDocument & { warnings?: string[] };

const KEY_STORAGE = "wristbridge.previewKey";

function readKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

function saveKey(v: string) {
  try {
    localStorage.setItem(KEY_STORAGE, v);
  } catch {
    /* storage unavailable: keep in memory only */
  }
}

/** `embed`: just the watch (no key field, buttons or JSON panel), for the landing page. */
export default function WatchPreview({ embed = false }: { embed?: boolean }) {
  const [apiKey, setApiKey] = useState("");
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [stack, setStack] = useState<Route[]>([]);
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState<CallAction | null>(null);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => setApiKey(readKey()), []);

  const headers = useCallback(
    (): HeadersInit => ({ "content-type": "application/json", ...(apiKey ? { "x-bridge-key": apiKey } : {}) }),
    [apiKey],
  );

  const loadApps = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/v1/apps?debug=1", { headers: headers() });
    const body = await res.json();
    if (!res.ok) return setError(body?.error?.message ?? `HTTP ${res.status}`);
    setApps(body.apps);
  }, [headers]);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  const route = stack[stack.length - 1];

  const loadScreen = useCallback(async () => {
    if (!route) return setDoc(null);
    setError(null);
    const qs = new URLSearchParams({ ...route.params, debug: "1" });
    const res = await fetch(`/api/v1/apps/${route.appId}/screens/${route.screen}?${qs}`, { headers: headers() });
    const body = await res.json();
    if (!res.ok) return setError(body?.error?.message ?? `HTTP ${res.status}`);
    setDoc(body);
  }, [route, headers]);

  useEffect(() => {
    void loadScreen();
  }, [loadScreen]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  async function runCall(action: CallAction) {
    if (!route) return;
    const res = await fetch(`/api/v1/apps/${route.appId}/actions/${action.id}?debug=1`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ payload: action.payload, params: route.params }),
    });
    const result = await res.json();
    if (!res.ok) return setToast(result?.error?.message ?? "Failed");
    if (result.message) setToast(result.message);
    const then = result.then ?? action.then ?? "refresh";
    if (then === "pop") setStack((s) => s.slice(0, -1));
    else if (then === "refresh") void loadScreen();
  }

  function perform(action: Action) {
    if (!route) return;
    if (action.type === "navigate") {
      setStack((s) => [...s, { appId: route.appId, screen: action.screen, params: action.params ?? {}, tint: route.tint }]);
    } else if (action.type === "refresh") {
      void loadScreen();
    } else if (action.confirm) {
      setPending(action);
    } else {
      void runCall(action);
    }
  }

  const tint = doc?.screen.tint ?? route?.tint ?? "#0A84FF";

  return (
    <div className={embed ? "preview embed" : "preview"}>
      {!embed && <div className="controls">
        <label>
          x-bridge-key
          <input
            value={apiKey}
            placeholder="empty if auth is off"
            onChange={(e) => {
              setApiKey(e.target.value);
              saveKey(e.target.value);
            }}
          />
        </label>
        <button onClick={() => void loadApps()}>Reload apps</button>
        <button onClick={() => setShowJson((v) => !v)}>{showJson ? "Hide" : "Show"} JSON</button>
        {doc?.warnings && doc.warnings.length > 0 && (
          <div className="warnings">
            <strong>Sanitizer warnings</strong>
            <ul>{doc.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </div>}

      <div className="watch" style={{ ["--tint" as string]: tint }}>
        <div className="screen">
          <div className="topbar">
            {route ? (
              <button className="back" onClick={() => setStack((s) => s.slice(0, -1))}>‹</button>
            ) : (
              <span />
            )}
            <span className="title">{route ? doc?.screen.title ?? "" : "WristBridge"}</span>
            {route ? <button className="back" onClick={() => void loadScreen()}>↻</button> : <span />}
          </div>
          <div className="scroll">
            {!route &&
              apps.map((a) => (
                <button
                  key={a.id}
                  className="row"
                  onClick={() => setStack([{ appId: a.id, screen: a.entry, params: {}, tint: a.themeColor }])}
                >
                  {a.icon ? <img src={a.icon} alt="" className="appicon" /> : <span className="sym">◎</span>}
                  <span className="rowtext">
                    <span className="rowtitle">{a.name}</span>
                  </span>
                  <span className="chev">›</span>
                </button>
              ))}
            {route && doc && doc.body.map((n, i) => <NodeView key={i} node={n} perform={perform} top />)}
          </div>
          {pending && (
            <div className="sheet">
              <p>{pending.confirm}</p>
              <button className="destructive" onClick={() => { setPending(null); void runCall(pending); }}>Confirm</button>
              <button onClick={() => setPending(null)}>Cancel</button>
            </div>
          )}
          {toast && <div className="toast">{toast}</div>}
        </div>
      </div>

      {!embed && showJson && <pre className="json">{JSON.stringify(doc ?? apps, null, 2)}</pre>}
      {embed && error && (
        <p className="embed-note">
          The live demo is off on this deployment ({error}). Open <a href="/preview">/preview</a> with a key.
        </p>
      )}
    </div>
  );
}

function symbolGlyph(name?: string): string {
  if (!name) return "";
  if (name.startsWith("checkmark")) return "✓";
  if (name === "circle") return "○";
  if (name.includes("plus")) return "+";
  if (name.includes("trash")) return "🗑";
  if (name.includes("info")) return "ⓘ";
  if (name.includes("arrow.clockwise")) return "↻";
  return "•";
}

function NodeView({ node, perform, top = false }: { node: Node; perform: (a: Action) => void; top?: boolean }) {
  switch (node.type) {
    case "text":
      return <p className={`t-${node.style ?? "body"}`} style={{ color: node.color, textAlign: node.align === "leading" ? "left" : node.align === "trailing" ? "right" : node.align }}>{node.text}</p>;
    case "section":
      return (
        <section className={top ? "section" : "section nested"}>
          {node.title && <h4>{node.title}</h4>}
          {node.children.map((c, i) => <NodeView key={i} node={c} perform={perform} />)}
          {node.footer && <p className="t-footnote">{node.footer}</p>}
        </section>
      );
    case "stack":
      return (
        <div className="stack" style={{ flexDirection: node.axis === "horizontal" ? "row" : "column", gap: node.spacing ?? 6 }}>
          {node.children.map((c, i) => <NodeView key={i} node={c} perform={perform} />)}
        </div>
      );
    case "row": {
      const content = (
        <>
          {node.icon && <span className="sym" style={{ color: node.tint }}>{symbolGlyph(node.icon)}</span>}
          <span className="rowtext">
            <span className="rowtitle">{node.title}</span>
            {node.subtitle && <span className="rowsub">{node.subtitle}</span>}
          </span>
          {node.value && <span className="rowsub">{node.value}</span>}
          {node.action?.type === "navigate" && <span className="chev">›</span>}
        </>
      );
      const action = node.action;
      return action ? <button className="row" onClick={() => perform(action)}>{content}</button> : <div className="row">{content}</div>;
    }
    case "metric":
      return (
        <div className="metric">
          <span className="rowsub">{node.label}</span>
          <span className="metricvalue" style={{ color: node.tint }}>
            {node.value}
            {node.unit && <small> {node.unit}</small>}
            {node.trend && <small> {node.trend === "up" ? "↗" : node.trend === "down" ? "↘" : "→"}</small>}
          </span>
        </div>
      );
    case "gauge": {
      const min = node.min ?? 0;
      const max = node.max ?? 1;
      const pct = Math.max(0, Math.min(1, (node.value - min) / (max - min || 1))) * 100;
      return (
        <div className="gauge">
          <div className="gaugelabels"><span>{node.label}</span><span>{node.valueLabel}</span></div>
          <div className="bar"><div style={{ width: `${pct}%`, background: node.tint ?? "var(--tint)" }} /></div>
        </div>
      );
    }
    case "chart": {
      const max = Math.max(...node.points.map((p) => p.y), 1);
      return (
        <div className="chart" style={{ height: node.height ?? 60 }}>
          {node.points.map((p, i) => (
            <div key={i} className="col">
              <div className="barv" style={{ height: `${(p.y / max) * 100}%`, background: node.tint ?? "var(--tint)" }} />
              <span>{p.x.slice(0, 1)}</span>
            </div>
          ))}
        </div>
      );
    }
    case "image":
      return <img src={node.url} alt={node.alt ?? ""} style={{ maxHeight: node.height ?? 90, maxWidth: "100%", borderRadius: 8 }} />;
    case "button":
      return (
        <button className={`wbutton ${node.role === "destructive" ? "destructive" : ""}`} style={{ color: node.tint }} onClick={() => perform(node.action)}>
          {node.icon && <span>{symbolGlyph(node.icon)} </span>}
          {node.label}
        </button>
      );
    case "toggle":
      return (
        <label className="row toggle">
          <span className="rowtitle">{node.label}</span>
          <input
            type="checkbox"
            defaultChecked={node.isOn}
            key={String(node.isOn)}
            onChange={(e) => {
              const base = node.action.payload && typeof node.action.payload === "object" ? (node.action.payload as object) : {};
              perform({ ...node.action, payload: { ...base, value: e.target.checked } });
            }}
          />
        </label>
      );
    case "divider":
      return <hr />;
    default:
      return null;
  }
}
