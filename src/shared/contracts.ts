import type { ComfortResult } from "../domain/comfort/comfort.types";

/** Normalized boundary returned by every weather provider. */
export interface WeatherSnapshot {
  cityId: string;
  cityName: string;
  country: string;
  description: string;
  iconCode: string;
  temperatureC: number;
  feelsLikeC: number;
  relativeHumidity: number;
  windSpeedMps: number;
  pressureHpa: number;
  visibilityM: number | null;
  observedAt: string;
}

/** Common scored shape keeps reusable UI independent from ranking status. */
export interface ScoredWeather extends WeatherSnapshot, ComfortResult {
  cacheStatus: "HIT" | "MISS";
  cacheAgeSeconds: number;
}

export interface RankedCity extends ScoredWeather { rank: number }

/** Nearby observations are intentionally excluded from the configured city ranking. */
export interface NearbyCity extends ScoredWeather {
  rank: null;
  nearby: true;
  coordinates: { latitude: number; longitude: number };
}

export interface RankingsResponse {
  cities: RankedCity[];
  generatedAt: string;
  algorithmVersion: ComfortResult["algorithmVersion"];
  partial: boolean;
  failures: Array<{ cityId: string; cityName: string; message: string }>;
  metadata: { requested: number; returned: number; cacheTtlSeconds: 300 };
}

export interface CacheDebugEntry {
  key: string;
  status: "HIT" | "MISS";
  ageSeconds: number;
  ttlSeconds: 300;
}
