/**
 * A tiny in-memory TTL cache.
 *
 * On Vercel each warm serverless instance keeps its own copy, so this is a
 * "best effort" cache: it saves repeated upstream calls while an instance is warm.
 * The watch also caches on its side (ETag + disk), so a cold instance is fine.
 * To share a cache across instances later, swap this for Vercel KV / Upstash (docs/08-roadmap.md).
 */
type Entry<T> = { value: T; expires: number };

export class TTLCache<T> {
  private store = new Map<string, Entry<T>>();
  constructor(private maxEntries = 500) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expires) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T, ttlSeconds: number): void {
    if (ttlSeconds <= 0) return;
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }

  /** Remove every key that starts with `prefix` (used after an action changes data). */
  invalidate(prefix: string): void {
    for (const key of this.store.keys()) if (key.startsWith(prefix)) this.store.delete(key);
  }

  async getOrSet(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const value = await load();
    this.set(key, value, ttlSeconds);
    return value;
  }
}
