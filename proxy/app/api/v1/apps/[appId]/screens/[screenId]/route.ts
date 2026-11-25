import { loadDescriptor } from "@/lib/descriptor";
import { bridgeRoute, json, screenParams } from "@/lib/handler";
import { getApp } from "@/lib/registry";
import { renderScreen } from "@/lib/render";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ appId: string; screenId: string }> };

/** GET /api/v1/apps/:appId/screens/:screenId?param=value -> WatchDocument */
export const GET = bridgeRoute(async (ctx, { params }: Params) => {
  const { appId, screenId } = await params;
  const app = getApp(appId, ctx.origin);
  const descriptor = await loadDescriptor(app);
  const doc = await renderScreen(app, descriptor, screenId, screenParams(ctx.url), ctx.warnings);
  return json(ctx.debug ? { ...doc, warnings: ctx.warnings } : doc, { req: ctx.req, maxAge: doc.ttl ?? 0 });
});
