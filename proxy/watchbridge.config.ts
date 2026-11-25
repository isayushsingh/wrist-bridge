/**
 * Register the PWAs this proxy is allowed to talk to.
 *
 * The proxy will ONLY fetch URLs on these origins (this is what stops it from being
 * abused as an open proxy — see docs/06-security.md).
 *
 * You can also add apps at deploy time with the WATCHBRIDGE_APPS env var (JSON array).
 */
import type { AppRegistration } from "./lib/registry";

const apps: AppRegistration[] = [
  {
    id: "demo",
    // "self" = the same deployment as this proxy (the demo PWA lives under /demo).
    origin: "self",
    descriptor: "/demo/watch.json",
    manifest: "/demo/manifest.webmanifest",
  },
  // Example: your own PWA
  // {
  //   id: "myapp",
  //   origin: "https://myapp.vercel.app",
  //   // descriptor defaults to /.well-known/watch.json, manifest to /manifest.webmanifest
  //   authTokenEnv: "MYAPP_TOKEN", // optional: sent as `Authorization: Bearer <token>`
  // },
];

export default apps;
