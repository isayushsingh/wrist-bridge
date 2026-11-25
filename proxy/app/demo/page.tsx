import { summary } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export const metadata = { title: "Demo Tasks", manifest: "/demo/manifest.webmanifest" };

/** The "real" PWA. On the watch, the same data is shown through watch.json. */
export default function DemoPWA() {
  const s = summary();
  return (
    <main className="page">
      <h1>Demo Tasks</h1>
      <p className="muted">
        {s.open} open · {s.done} done · {Math.round(s.progress * 100)}%
      </p>
      <ul className="tasks">
        {s.tasks.map((t) => (
          <li key={t.id} className={t.done ? "done" : ""}>
            {t.done ? "✓" : "○"} {t.title} <span className="muted">({t.priority})</span>
          </li>
        ))}
      </ul>
      <p className="muted">
        Watch descriptor: <a href="/demo/watch.json">/demo/watch.json</a> · API: <a href="/demo/api/tasks">/demo/api/tasks</a>
      </p>
    </main>
  );
}
