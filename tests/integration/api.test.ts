import { cities } from "../../src/data/cities";
import { MemoryTtlCache } from "../../src/worker/cache/cache";
import { createApp } from "../../src/worker/app";
import { FixtureWeatherProvider } from "../../src/worker/providers/fixture-weather-provider";
import { RankingService } from "../../src/worker/services/ranking-service";

describe("weather analytics API", () => {
  it("exposes a public health endpoint and JSON 404 response", async () => {
    const app = createApp();
    const health = await app.request("/api/health", {}, { DATA_MODE: "demo" });
    const missing = await app.request("/api/does-not-exist", {}, { DATA_MODE: "demo" });
    expect(await health.json()).toEqual({ status: "ok", algorithmVersion: "ocular-baseline" });
    expect(missing.status).toBe(404);
  });

  it("requires authentication outside demo mode", async () => {
    const response = await createApp().request("/api/rankings", {}, { DATA_MODE: "demo" });
    expect(response.status).toBe(401);
  });

  it("does not grant arbitrary cross-origin access to the same-origin API", async () => {
    const response = await createApp().request("/api/rankings", {
      method: "OPTIONS",
      headers: {
        origin: "https://untrusted.example",
        "access-control-request-method": "GET",
        "access-control-request-headers": "authorization",
      },
    }, { DATA_MODE: "demo" });

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it.each([
    "/api/rankings",
    `/api/cities/${cities[0]!.CityCode}`,
    "/api/location?lat=6.93&lon=79.86",
    "/api/debug/cache",
  ])("protects %s independently of the frontend", async (path) => {
    const response = await createApp().request(path, {}, { DATA_MODE: "demo" });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required" });
  });

  it("rejects a malformed bearer token", async () => {
    const response = await createApp().request(
      "/api/rankings",
      { headers: { authorization: "Bearer not-a-jwt" } },
      { DATA_MODE: "demo", AUTH0_DOMAIN: "example.auth0.com", AUTH0_AUDIENCE: "https://api.example.com" },
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Invalid or expired access token" });
  });

  it("fails closed when live weather is selected without an API key", async () => {
    const response = await createApp().request("/api/rankings", {}, { DATA_MODE: "live", AUTH_MODE: "demo" });
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Unexpected server error" });
    expect(JSON.stringify(body)).not.toContain("OPENWEATHER_API_KEY");
  });

  it("returns at least ten cities, sorted by score with required display fields", async () => {
    const response = await createApp().request("/api/rankings", {}, { DATA_MODE: "demo", AUTH_MODE: "demo" });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.cities).toHaveLength(12);
    expect(body.cities.every((city: Record<string, unknown>) => city.cityName && city.description && Number.isFinite(city.temperatureC) && Number.isFinite(city.score) && Number.isFinite(city.rank))).toBe(true);
    expect(body.cities.map((city: { score: number }) => city.score)).toEqual([...body.cities].map((city: { score: number }) => city.score).sort((a: number, b: number) => b - a));
  });

  it("reports MISS then HIT and expires raw weather after five minutes", async () => {
    let time = 0;
    const cache = new MemoryTtlCache(() => time);
    const service = new RankingService({ provider: new FixtureWeatherProvider(), cache });
    const city = cities[0]!;
    expect((await service.getCity(city)).cacheStatus).toBe("MISS");
    time = 299_000;
    expect((await service.getCity(city)).cacheStatus).toBe("HIT");
    time = 300_000;
    expect((await service.getCity(city)).cacheStatus).toBe("MISS");
  });

  it("keeps successful cities when one upstream request fails", async () => {
    const provider = new FixtureWeatherProvider();
    const service = new RankingService({
      cache: new MemoryTtlCache(),
      provider: { getCurrent: (city) => city === cities[1] ? Promise.reject(new Error("upstream unavailable")) : provider.getCurrent(city) },
    });
    const result = await service.getRankings(cities.slice(0, 3));
    expect(result.partial).toBe(true);
    expect(result.cities).toHaveLength(2);
    expect(result.failures[0]).toMatchObject({ cityName: cities[1]!.CityName, message: "upstream unavailable" });
  });

  it("retries after a failed cold request instead of retaining a rejected promise", async () => {
    const fixture = new FixtureWeatherProvider();
    let attempts = 0;
    const service = new RankingService({
      cache: new MemoryTtlCache(),
      provider: {
        getCurrent: async (city) => {
          attempts += 1;
          if (attempts === 1) throw new Error("temporary upstream failure");
          return fixture.getCurrent(city);
        },
      },
    });

    await expect(service.getCity(cities[0]!)).rejects.toThrow("temporary upstream failure");
    await expect(service.getCity(cities[0]!)).resolves.toMatchObject({ cacheStatus: "MISS" });
    expect(attempts).toBe(2);
  });

  it("uses city name as a deterministic tie-break and assigns sequential ranks", async () => {
    const fixture = new FixtureWeatherProvider();
    const reference = await fixture.getCurrent(cities[0]!);
    const tiedCities = [
      { CityCode: "3", CityName: "Zurich", source: "supplemental" as const },
      { CityCode: "2", CityName: "Amsterdam", source: "supplemental" as const },
      { CityCode: "1", CityName: "Berlin", source: "supplemental" as const },
    ];
    const service = new RankingService({
      cache: new MemoryTtlCache(),
      provider: { getCurrent: async (city) => ({ ...reference, cityId: city.CityCode, cityName: city.CityName }) },
    });

    const result = await service.getRankings(tiedCities);
    expect(result.cities.map((city) => city.cityName)).toEqual(["Amsterdam", "Berlin", "Zurich"]);
    expect(result.cities.map((city) => city.rank)).toEqual([1, 2, 3]);
  });

  it("reports every upstream failure when no city observation succeeds", async () => {
    const service = new RankingService({
      cache: new MemoryTtlCache(),
      provider: { getCurrent: async () => { throw new Error("upstream unavailable"); } },
    });

    const result = await service.getRankings(cities.slice(0, 3));
    expect(result.cities).toEqual([]);
    expect(result.failures).toHaveLength(3);
    expect(result.metadata).toMatchObject({ requested: 3, returned: 0 });
  });

  it("provides a cache debug endpoint with HIT/MISS and the required TTL", async () => {
    const cache = new MemoryTtlCache();
    const app = createApp({ cache });
    const coldResponse = await app.request("/api/debug/cache", {}, { DATA_MODE: "demo", AUTH_MODE: "demo" });
    const coldBody = await coldResponse.json();
    expect(coldBody.entries.every((entry: { status: string }) => entry.status === "MISS")).toBe(true);

    await app.request("/api/rankings", {}, { DATA_MODE: "demo", AUTH_MODE: "demo" });
    const response = await app.request("/api/debug/cache", {}, { DATA_MODE: "demo", AUTH_MODE: "demo" });
    const body = await response.json();
    expect(body.ttlSeconds).toBe(300);
    expect(body.entries).toHaveLength(12);
    expect(body.entries.every((entry: { status: string }) => entry.status === "HIT")).toBe(true);
  });

  it("returns one known city and rejects an unknown city ID", async () => {
    const app = createApp();
    const known = await app.request(`/api/cities/${cities[0]!.CityCode}`, {}, { DATA_MODE: "demo", AUTH_MODE: "demo" });
    const unknown = await app.request("/api/cities/not-a-city", {}, { DATA_MODE: "demo", AUTH_MODE: "demo" });
    expect(known.status).toBe(200);
    expect((await known.json()).cityName).toBe(cities[0]!.CityName);
    expect(unknown.status).toBe(404);
  });

  it("returns an unranked nearby observation without changing the twelve-city ranking", async () => {
    const app = createApp();
    const nearby = await app.request("/api/location?lat=6.9271&lon=79.8612", {}, { DATA_MODE: "demo", AUTH_MODE: "demo" });
    const ranking = await app.request("/api/rankings", {}, { DATA_MODE: "demo", AUTH_MODE: "demo" });

    expect(nearby.status).toBe(200);
    expect(await nearby.json()).toMatchObject({ rank: null, nearby: true, coordinates: { latitude: 6.93, longitude: 79.86 } });
    expect((await ranking.json()).cities).toHaveLength(12);
  });

  it("rejects missing or out-of-range nearby coordinates", async () => {
    const app = createApp();
    const missing = await app.request("/api/location", {}, { DATA_MODE: "demo", AUTH_MODE: "demo" });
    const invalid = await app.request("/api/location?lat=91&lon=181", {}, { DATA_MODE: "demo", AUTH_MODE: "demo" });
    expect(missing.status).toBe(400);
    expect(invalid.status).toBe(400);
  });

  it("rounds and caches repeated nearby observations", async () => {
    const service = new RankingService({ provider: new FixtureWeatherProvider(), cache: new MemoryTtlCache() });
    const first = await service.getNearby({ latitude: 6.9271, longitude: 79.8612 });
    const second = await service.getNearby({ latitude: 6.9299, longitude: 79.8599 });

    expect(first).toMatchObject({ cacheStatus: "MISS", coordinates: { latitude: 6.93, longitude: 79.86 } });
    expect(second).toMatchObject({ cacheStatus: "HIT", coordinates: { latitude: 6.93, longitude: 79.86 } });
  });

  it("limits upstream work to five simultaneous requests", async () => {
    let active = 0;
    let maximumActive = 0;
    const fixture = new FixtureWeatherProvider();
    const service = new RankingService({
      cache: new MemoryTtlCache(),
      provider: {
        getCurrent: async (city) => {
          active += 1;
          maximumActive = Math.max(maximumActive, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active -= 1;
          return fixture.getCurrent(city);
        },
      },
      concurrency: 99,
    });
    await service.getRankings(cities);
    expect(maximumActive).toBe(5);
  });
});
