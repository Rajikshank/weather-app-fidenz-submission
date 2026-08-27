import { cities } from "../../src/data/cities";
import { MemoryTtlCache } from "../../src/worker/cache/cache";
import { FixtureWeatherProvider } from "../../src/worker/providers/fixture-weather-provider";
import { RankingService } from "../../src/worker/services/ranking-service";

describe("ranking service under burst load", () => {
  it("coalesces concurrent cold requests so each city reaches the provider once", async () => {
    const fixture = new FixtureWeatherProvider();
    let providerCalls = 0;
    const service = new RankingService({
      cache: new MemoryTtlCache(),
      provider: {
        getCurrent: async (city) => {
          providerCalls += 1;
          await new Promise((resolve) => setTimeout(resolve, 5));
          return fixture.getCurrent(city);
        },
      },
    });

    const results = await Promise.all(Array.from({ length: 20 }, () => service.getRankings(cities)));

    expect(results.every((result) => result.cities.length === cities.length)).toBe(true);
    expect(providerCalls).toBe(cities.length);
    console.info(`[stress] cold burst: 20 ranking requests -> ${providerCalls} upstream calls (${20 * cities.length - providerCalls} calls coalesced)`);
  });

  it("serves 100 concurrent cached ranking requests consistently", async () => {
    const service = new RankingService({ provider: new FixtureWeatherProvider(), cache: new MemoryTtlCache() });
    await service.getRankings(cities);
    const startedAt = performance.now();
    const results = await Promise.all(Array.from({ length: 100 }, () => service.getRankings(cities)));
    const durationMs = performance.now() - startedAt;

    expect(results.every((result) => result.cities.length === 12 && result.cities.every((city) => city.cacheStatus === "HIT"))).toBe(true);
    // A generous local regression ceiling catches accidental serial/network work.
    expect(durationMs).toBeLessThan(2_500);
    console.info(`[stress] cache burst: 100 rankings / ${Math.round(durationMs)} ms (${Math.round(100_000 / durationMs)} requests/s)`);
  });

  it("serves a cached burst through the complete Worker HTTP route", async () => {
    const cache = new MemoryTtlCache();
    const service = new RankingService({ provider: new FixtureWeatherProvider(), cache });
    const { createApp } = await import("../../src/worker/app");
    const app = createApp({ service, cache });
    await app.request("/api/rankings", {}, { AUTH_MODE: "demo", DATA_MODE: "demo" });

    const requestCount = 200;
    const startedAt = performance.now();
    const responses = await Promise.all(Array.from({ length: requestCount }, () =>
      app.request("/api/rankings", {}, { AUTH_MODE: "demo", DATA_MODE: "demo" })));
    const durationMs = performance.now() - startedAt;
    const payloads = await Promise.all(responses.map((response) => response.json()));

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(payloads.every((payload) => payload.cities.length === cities.length && payload.partial === false)).toBe(true);
    expect(durationMs).toBeLessThan(4_000);
    console.info(`[stress] HTTP burst: ${requestCount} requests / ${Math.round(durationMs)} ms (${Math.round(requestCount * 1000 / durationMs)} requests/s)`);
  });

  it("coalesces a cold burst across complete Worker HTTP requests", async () => {
    const fixture = new FixtureWeatherProvider();
    let providerCalls = 0;
    const { createApp } = await import("../../src/worker/app");
    const app = createApp({
      cache: new MemoryTtlCache(),
      provider: {
        getCurrent: async (city) => {
          providerCalls += 1;
          await new Promise((resolve) => setTimeout(resolve, 5));
          return fixture.getCurrent(city);
        },
      },
    });

    const responses = await Promise.all(Array.from({ length: 20 }, () =>
      app.request("/api/rankings", {}, { AUTH_MODE: "demo", DATA_MODE: "demo" })));

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(providerCalls).toBe(cities.length);
  });
});
