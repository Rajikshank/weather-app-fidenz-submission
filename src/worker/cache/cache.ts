export const WEATHER_TTL_SECONDS = 300 as const;

export interface CacheRead<T> {
  value: T;
  ageSeconds: number;
}

export interface AppCache {
  get<T>(key: string): Promise<CacheRead<T> | null>;
  put<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  inspect(): Promise<Array<{ key: string; ageSeconds: number }>>;
}

interface MemoryEntry { value: unknown; storedAtMs: number; expiresAtMs: number }

export class MemoryTtlCache implements AppCache {
  private readonly entries = new Map<string, MemoryEntry>();

  constructor(private readonly now: () => number = Date.now) {}

  async get<T>(key: string): Promise<CacheRead<T> | null> {
    const entry = this.entries.get(key);
    if (!entry || entry.expiresAtMs <= this.now()) {
      this.entries.delete(key);
      return null;
    }
    return { value: entry.value as T, ageSeconds: Math.floor((this.now() - entry.storedAtMs) / 1000) };
  }

  async put<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const storedAtMs = this.now();
    this.entries.set(key, { value, storedAtMs, expiresAtMs: storedAtMs + ttlSeconds * 1000 });
  }

  async inspect() {
    const entries: Array<{ key: string; ageSeconds: number }> = [];
    for (const [key] of this.entries) {
      const result = await this.get(key);
      if (result) entries.push({ key, ageSeconds: result.ageSeconds });
    }
    return entries;
  }
}

/** Uses the Workers Cache API in production; stored metadata makes age observable. */
export class WorkersCache implements AppCache {
  private readonly knownKeys = new Set<string>();
  constructor(private readonly cache: Cache) {}
  private requestFor(key: string) { return new Request(`https://cache.ocucomfort.internal/${key}`); }

  async get<T>(key: string): Promise<CacheRead<T> | null> {
    const response = await this.cache.match(this.requestFor(key));
    if (!response) return null;
    const storedAtMs = Number(response.headers.get("x-ocu-stored-at"));
    return { value: (await response.json()) as T, ageSeconds: Math.max(0, Math.floor((Date.now() - storedAtMs) / 1000)) };
  }

  async put<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.knownKeys.add(key);
    await this.cache.put(this.requestFor(key), new Response(JSON.stringify(value), {
      headers: { "content-type": "application/json", "cache-control": `public, max-age=${ttlSeconds}`, "x-ocu-stored-at": String(Date.now()) },
    }));
  }

  async inspect() {
    const entries = await Promise.all([...this.knownKeys].map(async (key) => {
      const hit = await this.get(key);
      return hit ? { key, ageSeconds: hit.ageSeconds } : null;
    }));
    return entries.filter((entry): entry is { key: string; ageSeconds: number } => entry !== null);
  }
}
