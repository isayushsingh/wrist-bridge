/**
 * In-memory data for the demo PWA ("Demo Tasks").
 * It resets whenever the server restarts / a new serverless instance starts. That's fine for a demo.
 * Your real PWA has its own database; the proxy never touches it directly.
 */
export type Task = {
  id: string;
  title: string;
  done: boolean;
  due: string; // ISO date
  priority: "low" | "medium" | "high";
  doneAt?: string;
};

type Store = { tasks: Task[]; nextId: number };

const g = globalThis as unknown as { __wristbridgeDemo?: Store };

function daysFromNow(n: number): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString();
}

function seed(): Store {
  return {
    nextId: 6,
    tasks: [
      { id: "1", title: "Revise GS2 polity notes", done: false, due: daysFromNow(0), priority: "high" },
      { id: "2", title: "10 km easy run", done: true, due: daysFromNow(0), priority: "medium", doneAt: daysFromNow(0) },
      { id: "3", title: "Answer-writing: 2 questions", done: false, due: daysFromNow(1), priority: "high" },
      { id: "4", title: "Call the electrician", done: true, due: daysFromNow(-1), priority: "low", doneAt: daysFromNow(-1) },
      { id: "5", title: "Read The Hindu editorial", done: false, due: daysFromNow(2), priority: "medium" },
    ],
  };
}

export function store(): Store {
  g.__wristbridgeDemo ??= seed();
  return g.__wristbridgeDemo;
}

export function summary() {
  const { tasks } = store();
  const done = tasks.filter((t) => t.done).length;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const history = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() - (6 - i));
    const key = day.toISOString().slice(0, 10);
    // A little fake history so the chart isn't empty, plus real completions.
    const baseline = [2, 3, 1, 4, 2, 3, 0][i] ?? 0;
    const real = tasks.filter((t) => t.doneAt?.slice(0, 10) === key).length;
    return { day: days[day.getUTCDay()], completed: baseline + real };
  });
  return {
    tasks: [...tasks].sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due)),
    total: tasks.length,
    done,
    open: tasks.length - done,
    progress: tasks.length ? Math.round((done / tasks.length) * 100) / 100 : 0,
    history,
  };
}

export function findTask(id: string): Task | undefined {
  return store().tasks.find((t) => t.id === id);
}

export function setDone(id: string, done: boolean): Task | undefined {
  const t = findTask(id);
  if (!t) return undefined;
  t.done = done;
  t.doneAt = done ? new Date().toISOString() : undefined;
  return t;
}

export function addTask(title: string): Task {
  const s = store();
  const task: Task = { id: String(s.nextId++), title: title.slice(0, 80) || "Untitled", done: false, due: daysFromNow(0), priority: "low" };
  s.tasks.push(task);
  return task;
}

export function deleteTask(id: string): boolean {
  const s = store();
  const before = s.tasks.length;
  s.tasks = s.tasks.filter((t) => t.id !== id);
  return s.tasks.length < before;
}
