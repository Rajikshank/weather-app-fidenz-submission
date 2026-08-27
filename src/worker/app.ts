import { Hono } from "hono";
import { cities } from "../data/cities";
import { ALGORITHM_ID } from "../domain/comfort/comfort.config";
import { MemoryTtlCache, WorkersCache, WEATHER_TTL_SECONDS, type AppCache } from "./cache/cache";
import { requireAuthentication, type AuthEnv } from "./auth/auth";
import { FixtureWeatherProvider } from "./providers/fixture-weather-provider";
import { OpenWeatherProvider, type WeatherProvider } from "./providers/weather-provider";
import { RankingService } from "./services/ranking-service";

export interface WorkerEnv extends AuthEnv {
  OPENWEATHER_API_KEY?: string;
  DATA_MODE?: "live" | "demo";
}

interface AppDependencies { cache?: AppCache; service?: RankingService; provider?: WeatherProvider }
const localCache = new MemoryTtlCache();
let workerCache: WorkersCache | undefined;

function resolveCache(dependencies: AppDependencies) {
  if (dependencies.cache) return dependencies.cache;
  if (typeof caches === "undefined") return localCache;
  workerCache ??= new WorkersCache((caches as CacheStorage & { default: Cache }).default);
  return workerCache;
}

function createService(env: WorkerEnv, dependencies: AppDependencies) {
  if (dependencies.service) return dependencies.service;
  const runtimeCache = resolveCache(dependencies);
  if (dependencies.provider) {
    return new RankingService({ provider: dependencies.provider, cache: runtimeCache });
  }
  if (env.DATA_MODE === "demo") {
    return new RankingService({ provider: new FixtureWeatherProvider(), cache: runtimeCache });
  }
  // Live mode must fail closed. Silently serving fixtures when a production
  // secret is missing would present invented observations as current weather.
  if (!env.OPENWEATHER_API_KEY) {
    throw new Error("OPENWEATHER_API_KEY is required when DATA_MODE is live");
  }
  const provider = new OpenWeatherProvider(env.OPENWEATHER_API_KEY);
  return new RankingService({ provider, cache: runtimeCache });
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = new Hono<{ Bindings: WorkerEnv }>();
  // `createApp()` runs once per Worker isolate. Reusing this service across
  // requests makes its in-flight map coalesce concurrent cold API requests.
  let service = dependencies.service;
  const getService = (env: WorkerEnv) => service ??= createService(env, dependencies);
  app.get("/api/health", (context) => context.json({ status: "ok", algorithmVersion: ALGORITHM_ID }));
  app.use("/api/rankings", requireAuthentication());
  app.use("/api/location", requireAuthentication());
  app.use("/api/cities/*", requireAuthentication());
  app.use("/api/debug/*", requireAuthentication());

  app.get("/api/rankings", async (context) => context.json(await getService(context.env).getRankings(cities)));
  app.get("/api/location", async (context) => {
    const latitude = Number(context.req.query("lat"));
    const longitude = Number(context.req.query("lon"));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return context.json({ error: "Valid latitude and longitude are required" }, 400);
    }
    return context.json(await getService(context.env).getNearby({ latitude, longitude }));
  });
  app.get("/api/cities/:id", async (context) => {
    const city = cities.find((item) => item.CityCode === context.req.param("id"));
    if (!city) return context.json({ error: "City not found" }, 404);
    return context.json(await getService(context.env).getCity(city));
  });
  app.get("/api/debug/cache", async (context) => {
    const cache = resolveCache(dependencies);
    const entries = await cache.inspect();
    return context.json({
      algorithmVersion: ALGORITHM_ID,
      ttlSeconds: WEATHER_TTL_SECONDS,
      entries: cities.map((city) => {
        const hit = entries.find((entry) => entry.key === `weather:${city.CityCode}`);
        return { cityId: city.CityCode, cityName: city.CityName, status: hit ? "HIT" : "MISS", ageSeconds: hit?.ageSeconds ?? 0, ttlSeconds: WEATHER_TTL_SECONDS };
      }),
    });
  });
  app.notFound((context) => context.json({ error: "Not found" }, 404));
  app.onError((error, context) => {
    // Keep implementation details in Worker logs; API clients receive a stable,
    // non-sensitive error contract regardless of the underlying failure.
    if (context.env.AUTH_MODE !== "demo") console.error("Unhandled API error", error);
    return context.json({ error: "Unexpected server error" }, 500);
  });
  return app;
}
