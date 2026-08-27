import type { CityDefinition } from "../../data/cities";
import type { WeatherSnapshot } from "../../shared/contracts";
import type { WeatherCoordinates, WeatherProvider } from "./weather-provider";

const conditions: Record<string, Omit<WeatherSnapshot, "cityId" | "cityName" | "observedAt">> = {
  "1248991": { country: "LK", description: "scattered clouds", iconCode: "03d", temperatureC: 29, feelsLikeC: 33, relativeHumidity: 76, windSpeedMps: 4.2, pressureHpa: 1009, visibilityM: 9000 },
  "1850147": { country: "JP", description: "clear sky", iconCode: "01d", temperatureC: 23, feelsLikeC: 23, relativeHumidity: 58, windSpeedMps: 2.1, pressureHpa: 1014, visibilityM: 10000 },
  "2644210": { country: "GB", description: "light rain", iconCode: "10d", temperatureC: 16, feelsLikeC: 15, relativeHumidity: 72, windSpeedMps: 5.4, pressureHpa: 1008, visibilityM: 8000 },
  "2988507": { country: "FR", description: "few clouds", iconCode: "02d", temperatureC: 22, feelsLikeC: 22, relativeHumidity: 52, windSpeedMps: 2.8, pressureHpa: 1017, visibilityM: 10000 },
  "2147714": { country: "AU", description: "broken clouds", iconCode: "04d", temperatureC: 21, feelsLikeC: 21, relativeHumidity: 63, windSpeedMps: 3.4, pressureHpa: 1018, visibilityM: 10000 },
  "4930956": { country: "US", description: "mist", iconCode: "50d", temperatureC: 18, feelsLikeC: 18, relativeHumidity: 68, windSpeedMps: 1.7, pressureHpa: 1015, visibilityM: 6000 },
  "1796236": { country: "CN", description: "overcast clouds", iconCode: "04d", temperatureC: 27, feelsLikeC: 29, relativeHumidity: 64, windSpeedMps: 3.1, pressureHpa: 1010, visibilityM: 7000 },
  "3143244": { country: "NO", description: "clear sky", iconCode: "01d", temperatureC: 14, feelsLikeC: 13, relativeHumidity: 57, windSpeedMps: 2.5, pressureHpa: 1020, visibilityM: 10000 },
  "2158177": { country: "AU", description: "clear sky", iconCode: "01d", temperatureC: 19, feelsLikeC: 19, relativeHumidity: 61, windSpeedMps: 1.8, pressureHpa: 1021, visibilityM: 10000 },
  "5128581": { country: "US", description: "haze", iconCode: "50d", temperatureC: 26, feelsLikeC: 27, relativeHumidity: 49, windSpeedMps: 4.1, pressureHpa: 1012, visibilityM: 7500 },
  "1273294": { country: "IN", description: "haze", iconCode: "50d", temperatureC: 35, feelsLikeC: 37, relativeHumidity: 27, windSpeedMps: 2.9, pressureHpa: 1003, visibilityM: 4500 },
  "292223": { country: "AE", description: "clear sky", iconCode: "01d", temperatureC: 39, feelsLikeC: 41, relativeHumidity: 22, windSpeedMps: 5.1, pressureHpa: 999, visibilityM: 8000 }
};

/** Deterministic local data keeps tests, demos, and visual review reproducible. */
export class FixtureWeatherProvider implements WeatherProvider {
  async getCurrent(city: CityDefinition): Promise<WeatherSnapshot> {
    const weather = conditions[city.CityCode];
    if (!weather) throw new Error("No fixture available for city");
    return { cityId: city.CityCode, cityName: city.CityName, observedAt: "2026-08-26T09:00:00.000Z", ...weather };
  }

  async getCurrentAt({ latitude, longitude }: WeatherCoordinates): Promise<WeatherSnapshot> {
    const weather = conditions["1248991"]!;
    return {
      cityId: `nearby:${latitude.toFixed(2)}:${longitude.toFixed(2)}`,
      cityName: "Colombo",
      observedAt: "2026-08-26T09:00:00.000Z",
      ...weather,
    };
  }
}
