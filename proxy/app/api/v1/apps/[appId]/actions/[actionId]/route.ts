import { loadDescriptor } from "@/lib/descriptor";
import { badRequest } from "@/lib/errors";
import { bridgeRoute, json } from "@/lib/handler";
import { getApp } from "@/lib/registry";
import { performAction } from "@/lib/render";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ appId: string; actionId: string }> };

/**
 * POST /api/v1/apps/:appId/actions/:actionId
 * Body: { "payload": any, "params": { [k]: string } }  ->  ActionResult
 */
export const POST = bridgeRoute(async (ctx, { params }: Params) => {
  const { appId, actionId } = await params;
  let body: { payload?: unknown; params?: Record<string, string> } = {};
  const text = await ctx.req.text();
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      throw badRequest("Body must be JSON");
    }
  }
  const app = getApp(appId, ctx.origin);
  const descriptor = await loadDescriptor(app);
  const result = await performAction(app, descriptor, actionId, body, ctx.warnings);
  return json(ctx.debug ? { ...result, warnings: ctx.warnings } : result, { status: 200 });
});
