import { json } from "@/lib/handler";
import { SCHEMA_VERSION } from "@/lib/watchui";

/** Unauthenticated liveness check. Never returns app data. */
export async function GET() {
  return json({ ok: true, service: "wristbridge-proxy", schemaVersion: SCHEMA_VERSION, auth: !!process.env.BRIDGE_API_KEY });
}
