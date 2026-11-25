// Demo PWA API — stands in for *your* app's existing JSON API.
import { addTask, summary } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(summary());
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { title?: unknown };
  const task = addTask(typeof body.title === "string" ? body.title : "New task");
  return Response.json({ task, message: `Added “${task.title}”` }, { status: 201 });
}
