import { deleteTask, findTask } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const task = findTask((await params).id);
  return task ? Response.json({ task }) : Response.json({ message: "Task not found" }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return deleteTask((await params).id)
    ? Response.json({ ok: true })
    : Response.json({ message: "Task not found" }, { status: 404 });
}
