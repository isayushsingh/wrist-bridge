import { findTask, setDone } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST { done?: boolean } — sets done, or flips it when `done` is missing. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const current = findTask(id);
  if (!current) return Response.json({ message: "Task not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { done?: unknown };
  const done = typeof body.done === "boolean" ? body.done : !current.done;
  return Response.json({ task: setDone(id, done) });
}
