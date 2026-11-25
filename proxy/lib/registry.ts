/** Which apps exist, and where they live. */
import configuredApps from "@/watchbridge.config";
import { badRequest, notFound } from "./errors";

export type AppRegistration = {
  /** URL-safe id used by the watch: /api/v1/apps/<id>/... */
  id: string;
  /** "https://myapp.example" or "self" (same origin as the proxy). */
  origin: string;
  /** Path to watch.json. Default: /.well-known/watch.json */
  descriptor?: string;
  /** Path to the web app manifest. Default: /manifest.webmanifest */
  manifest?: string;
  /** Name of an env var holding a bearer token for the app's API. */
  authTokenEnv?: string;
};

export type ResolvedApp = Required<Omit<AppRegistration, "authTokenEnv">> & { authTokenEnv?: string };

const ID = /^[a-z0-9][a-z0-9-]{0,40}$/;

function envApps(): AppRegistration[] {
  const raw = process.env.WATCHBRIDGE_APPS;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppRegistration[]) : [];
  } catch {
    console.warn("[wristbridge] WATCHBRIDGE_APPS is not valid JSON; ignoring");
    return [];
  }
}

export function allRegistrations(): AppRegistration[] {
  const byId = new Map<string, AppRegistration>();
  for (const app of [...configuredApps, ...envApps()]) {
    if (ID.test(app.id)) byId.set(app.id, app);
  }
  return [...byId.values()];
}

/** Turn a registration into absolute URLs. `requestOrigin` resolves origin: "self". */
export function resolveApp(app: AppRegistration, requestOrigin: string): ResolvedApp {
  const originRaw = app.origin === "self" ? requestOrigin : app.origin;
  let origin: string;
  try {
    origin = new URL(originRaw).origin;
  } catch {
    throw badRequest(`App "${app.id}" has an invalid origin`);
  }
  return {
    id: app.id,
    origin,
    descriptor: app.descriptor ?? "/.well-known/watch.json",
    manifest: app.manifest ?? "/manifest.webmanifest",
    authTokenEnv: app.authTokenEnv,
  };
}

export function getApp(id: string, requestOrigin: string): ResolvedApp {
  const app = allRegistrations().find((a) => a.id === id);
  if (!app) throw notFound(`App "${id}"`);
  return resolveApp(app, requestOrigin);
}
