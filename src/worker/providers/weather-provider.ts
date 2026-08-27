import type { CityDefinition } from "../../data/cities";
import type { WeatherSnapshot } from "../../shared/contracts";

export interface WeatherProvider {
  getCurrent(city: CityDefinition): Promise<WeatherSnapshot>;
  getCurrentAt?(coordinates: WeatherCoordinates): Promise<WeatherSnapshot>;
}

export interface WeatherCoordinates { latitude: number; longitude: number }

interface OpenWeatherPayload {
  id: number;
  name: string;
  weather: Array<{ description: string; icon: string }>;
  main: { temp: number; feels_like: number; humidity: number; pressure: number };
  visibility?: number;
  wind: { speed: number };
  dt: number;
  sys: { country: string };
}

export class OpenWeatherProvider implements WeatherProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async getCurrent(city: CityDefinition): Promise<WeatherSnapshot> {
    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    url.searchParams.set("id", city.CityCode);
    return this.fetchWeather(url);
  }

  async getCurrentAt({ latitude, longitude }: WeatherCoordinates): Promise<WeatherSnapshot> {
    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    return this.fetchWeather(url);
  }

  private async fetchWeather(url: URL): Promise<WeatherSnapshot> {
    url.searchParams.set("appid", this.apiKey);
    url.searchParams.set("units", "metric");

    // Cloudflare's platform fetch validates its receiver. Calling a stored
    // reference as `this.fetcher(...)` binds the provider instance and throws
    // `Illegal invocation`, so explicitly retain the global receiver.
    const response = await this.fetcher.call(globalThis, url);
    if (!response.ok) {
      throw new Error(`OpenWeather request failed (${response.status})`);
    }

    const payload = (await response.json()) as OpenWeatherPayload;
    return {
      cityId: String(payload.id),
      cityName: payload.name,
      country: payload.sys.country,
      description: payload.weather[0]?.description ?? "Unknown conditions",
      iconCode: payload.weather[0]?.icon ?? "01d",
      temperatureC: payload.main.temp,
      feelsLikeC: payload.main.feels_like,
      relativeHumidity: payload.main.humidity,
      windSpeedMps: payload.wind.speed,
      pressureHpa: payload.main.pressure,
      visibilityM: payload.visibility ?? null,
      observedAt: new Date(payload.dt * 1000).toISOString(),
    };
  }
}
