"use client";

/** Small client-side pieces of the landing page: scroll reveal, the pipeline stepper, the diagram gallery. */
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fades children in when they scroll into view (instantly where IntersectionObserver is missing or motion is reduced). */
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setShown(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${shown ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

type Step = { title: string; body: string; code: string };

/** Auto-advancing stepper; hover or click pauses it on a step. */
export function Stepper({ steps, interval = 2600 }: { steps: Step[]; interval?: number }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setActive((a) => (a + 1) % steps.length), interval);
    return () => clearInterval(t);
  }, [paused, steps.length, interval]);
  const step = steps[active];
  return (
    <div className="stepper" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <ol className="steps">
        {steps.map((s, i) => (
          <li key={s.title}>
            <button
              className={i === active ? "on" : i < active ? "done" : ""}
              onClick={() => {
                setActive(i);
                setPaused(true);
              }}
            >
              <span className="num">{i + 1}</span>
              <span>{s.title}</span>
            </button>
          </li>
        ))}
      </ol>
      {step && (
        <div className="stepbody" key={active}>
          <p>{step.body}</p>
          <pre className="code">{step.code}</pre>
        </div>
      )}
      <div className="progress">
        <div style={{ width: `${((active + 1) / steps.length) * 100}%` }} />
      </div>
    </div>
  );
}

type Diagram = { file: string; title: string; caption: string };

export function DiagramTabs({ diagrams }: { diagrams: Diagram[] }) {
  const [active, setActive] = useState(0);
  const d = diagrams[active];
  return (
    <div className="diagrams">
      <div className="tabs" role="tablist">
        {diagrams.map((x, i) => (
          <button key={x.file} role="tab" aria-selected={i === active} className={i === active ? "on" : ""} onClick={() => setActive(i)}>
            {x.title}
          </button>
        ))}
      </div>
      {d && (
        <figure key={d.file} className="diagram">
          <a href={`/diagrams/${d.file}`} target="_blank" rel="noreferrer">
            <img src={`/diagrams/${d.file}`} alt={d.title} loading="lazy" />
          </a>
          <figcaption>{d.caption}</figcaption>
        </figure>
      )}
    </div>
  );
}
