import { loadDescriptor } from "@/lib/descriptor";
import { bridgeRoute, json } from "@/lib/handler";
import { getApp } from "@/lib/registry";
import { renderComplication } from "@/lib/render";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ appId: string }> };

/** GET /api/v1/apps/:appId/complication -> ComplicationPayload */
export const GET = bridgeRoute(async (ctx, { params }: Params) => {
  const { appId } = await params;
  const app = getApp(appId, ctx.origin);
  const descriptor = await loadDescriptor(app);
  const payload = await renderComplication(app, descriptor, ctx.warnings);
  return json(ctx.debug ? { ...payload, warnings: ctx.warnings } : payload, { req: ctx.req, maxAge: 300 });
});
