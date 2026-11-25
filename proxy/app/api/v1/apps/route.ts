import { loadAppInfo } from "@/lib/descriptor";
import { bridgeRoute, json } from "@/lib/handler";
import { allRegistrations, resolveApp } from "@/lib/registry";
import type { AppInfo } from "@/lib/watchui";

export const dynamic = "force-dynamic";

/** GET /api/v1/apps -> { apps: AppInfo[] }. Apps whose watch.json fails to load are skipped. */
export const GET = bridgeRoute(async (ctx) => {
  const results = await Promise.allSettled(
    allRegistrations().map((reg) => loadAppInfo(resolveApp(reg, ctx.origin))),
  );
  const apps: AppInfo[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") apps.push(r.value);
    else ctx.warnings.push(`app ${allRegistrations()[i]?.id}: ${r.reason instanceof Error ? r.reason.message : r.reason}`);
  });
  return json({ apps, ...(ctx.debug ? { warnings: ctx.warnings } : {}) }, { req: ctx.req, maxAge: 60 });
});
