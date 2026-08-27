import { MemoryTtlCache, WorkersCache } from "../../src/worker/cache/cache";

describe("cache adapters", () => {
  it("removes expired memory entries from inspection", async () => {
    let now = 1_000;
    const cache = new MemoryTtlCache(() => now);
    await cache.put("weather:1", { ok: true }, 1);
    expect(await cache.inspect()).toEqual([{ key: "weather:1", ageSeconds: 0 }]);
    now = 2_001;
    expect(await cache.inspect()).toEqual([]);
  });

  it("stores JSON with a Worker TTL and reports cache age", async () => {
    const entries = new Map<string, Response>();
    const fakeCache = {
      match: async (request: RequestInfo | URL) => entries.get(request.toString())?.clone(),
      put: async (request: RequestInfo | URL, response: Response) => { entries.set(request.toString(), response.clone()); },
    } as Cache;
    const now = vi.spyOn(Date, "now").mockReturnValue(10_000);
    const cache = new WorkersCache(fakeCache);
    expect(await cache.get("weather:1")).toBeNull();
    await cache.put("weather:1", { temperature: 20 }, 300);
    now.mockReturnValue(12_500);
    expect(await cache.get<{ temperature: number }>("weather:1")).toEqual({ value: { temperature: 20 }, ageSeconds: 2 });
    expect(await cache.inspect()).toEqual([{ key: "weather:1", ageSeconds: 2 }]);
    expect(entries.values().next().value?.headers.get("cache-control")).toBe("public, max-age=300");
    now.mockRestore();
  });
});
