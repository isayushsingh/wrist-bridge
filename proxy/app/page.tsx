import Link from "next/link";
import { allRegistrations } from "@/lib/registry";

export const dynamic = "force-dynamic";

export default function Home() {
  const apps = allRegistrations();
  return (
    <main className="page">
      <h1>WristBridge proxy</h1>
      <p className="muted">Turns a PWA&apos;s JSON into WatchUI documents for the Apple Watch app.</p>
      <ul className="links">
        <li><Link href="/preview">Watch preview</Link>: render any screen in the browser, no Mac needed</li>
        <li><Link href="/demo">Demo PWA</Link>: the sample “Demo Tasks” app the proxy talks to</li>
        <li><a href="/api/v1/health">/api/v1/health</a>: liveness check</li>
      </ul>
      <h2>Registered apps</h2>
      <ul>
        {apps.map((a) => (
          <li key={a.id}>
            <code>{a.id}</code> → {a.origin === "self" ? "this deployment" : a.origin}
          </li>
        ))}
      </ul>
    </main>
  );
}
