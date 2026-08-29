import type { CityDefinition } from "../../data/cities";
import { calculateComfort } from "../../domain/comfort/calculate-comfort";
import { ALGORITHM_ID } from "../../domain/comfort/comfort.config";
import type { NearbyCity, RankedCity, RankingsResponse, ScoredWeather, WeatherSnapshot } from "../../shared/contracts";
import { WEATHER_TTL_SECONDS, type AppCache } from "../cache/cache";
import type { WeatherCoordinates, WeatherProvider } from "../providers/weather-provider";

interface RankingDependencies {
  provider: WeatherProvider;
  cache: AppCache;
  now?: () => Date;
  concurrency?: number;
}

async function concurrentMap<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try { results[index] = { status: "fulfilled", value: await work(items[index]!) }; }
      catch (reason) { results[index] = { status: "rejected", reason }; }
    }
  });
  await Promise.all(workers);
  return results;
}

export class RankingService {
  private readonly now: () => Date;
  private readonly concurrency: number;
  private readonly inFlightWeather = new Map<string, Promise<WeatherSnapshot>>();

  constructor(private readonly deps: RankingDependencies) {
    this.now = deps.now ?? (() => new Date());
    // Workers allow six concurrent outbound connections; five leaves headroom.
    this.concurrency = Math.max(1, Math.min(deps.concurrency ?? 5, 5));
  }

  async getRankings(cityList: CityDefinition[]): Promise<RankingsResponse> {
    const settled = await concurrentMap(cityList, this.concurrency, async (city) => this.getCity(city));
    const successful = settled
      .filter((result): result is PromiseFulfilledResult<Omit<RankedCity, "rank">> => result.status === "fulfilled")
      .map((result) => result.value)
      .sort((a, b) => b.score - a.score || a.cityName.localeCompare(b.cityName));
    const failures = settled.flatMap((result, index) => result.status === "rejected" ? [{
      cityId: cityList[index]!.CityCode,
      cityName: cityList[index]!.CityName,
      message: result.reason instanceof Error ? result.reason.message : "Unknown upstream error",
    }] : []);

    return {
      cities: successful.map((city, index) => ({ ...city, rank: index + 1 })),
      generatedAt: this.now().toISOString(),
      algorithmVersion: ALGORITHM_ID,
      partial: failures.length > 0,
      failures,
      metadata: { requested: cityList.length, returned: successful.length, cacheTtlSeconds: WEATHER_TTL_SECONDS },
    };
  }

  async getCity(city: CityDefinition): Promise<Omit<RankedCity, "rank">> {
    const key = `weather:${city.CityCode}`;
    const { weather, cacheStatus, cacheAgeSeconds } = await this.readWeather(key, () => this.deps.provider.getCurrent(city));
    return this.scoreWeather(weather, cacheStatus, cacheAgeSeconds);
  }

  async getNearby(coordinates: WeatherCoordinates): Promise<NearbyCity> {
    if (!this.deps.provider.getCurrentAt) throw new Error("Nearby weather is unavailable");

    // Two decimal places are precise enough for local weather while avoiding
    // exact coordinates in cache keys (roughly a one-kilometre grid).
    const rounded = {
      latitude: Number(coordinates.latitude.toFixed(2)),
      longitude: Number(coordinates.longitude.toFixed(2)),
    };
    const key = `weather:nearby:${rounded.latitude}:${rounded.longitude}`;
    const { weather, cacheStatus, cacheAgeSeconds } = await this.readWeather(key, () => this.deps.provider.getCurrentAt!(rounded));
    return { ...this.scoreWeather(weather, cacheStatus, cacheAgeSeconds), rank: null, nearby: true, coordinates: rounded };
  }

  private scoreWeather(weather: WeatherSnapshot, cacheStatus: "HIT" | "MISS", cacheAgeSeconds: number): ScoredWeather {
    // Keep scoring on the server and pass every normalized weather input into
    // the pure calculator so the browser cannot alter ranked results.
    const comfort = calculateComfort({
      temperatureC: weather.temperatureC,
      relativeHumidity: weather.relativeHumidity,
      windSpeedMps: weather.windSpeedMps,
      visibilityM: weather.visibilityM,
    });
    return { ...weather, ...comfort, cacheStatus, cacheAgeSeconds };
  }

  private async readWeather(key: string, load: () => Promise<WeatherSnapshot>) {
    const cached = await this.deps.cache.get<WeatherSnapshot>(key);
    if (cached) return { weather: cached.value, cacheStatus: "HIT" as const, cacheAgeSeconds: cached.ageSeconds };
    return { weather: await this.fetchAndCache(key, load), cacheStatus: "MISS" as const, cacheAgeSeconds: 0 };
  }

  private async fetchAndCache(key: string, load: () => Promise<WeatherSnapshot>): Promise<WeatherSnapshot> {
    const existing = this.inFlightWeather.get(key);
    if (existing) return existing;

    // Coalesce cold bursts within one Worker isolate. Without this single-flight
    // guard, 20 simultaneous dashboard loads would fan out to 240 API requests.
    const request = (async () => {
      const weather = await load();
      await this.deps.cache.put(key, weather, WEATHER_TTL_SECONDS);
      return weather;
    })();
    this.inFlightWeather.set(key, request);

    try {
      return await request;
    } finally {
      // Only the creator removes the entry, including after provider failures,
      // so a transient error never poisons later retries.
      if (this.inFlightWeather.get(key) === request) this.inFlightWeather.delete(key);
    }
  }
}
