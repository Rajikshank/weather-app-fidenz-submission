// These tests verify the provider boundary: request parameters, safe errors,
// coordinate lookups and conversion into the app's weather shape.
import { OpenWeatherProvider } from "../../src/worker/providers/weather-provider";

describe("OpenWeather boundary", () => {
  it("requests by CityCode in metric units and normalizes the response", async () => {
    let requestedUrl = "";
    const provider = new OpenWeatherProvider("secret-key", async (input) => {
      requestedUrl = input.toString();
      return new Response(JSON.stringify({
        id: 1248991,
        name: "Colombo",
        weather: [{ description: "few clouds", icon: "02d" }],
        main: { temp: 29.2, feels_like: 32, humidity: 77, pressure: 1009 },
        visibility: 9000,
        wind: { speed: 3.5 },
        dt: 1787734800,
        sys: { country: "LK" },
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const result = await provider.getCurrent({ CityCode: "1248991", CityName: "Colombo", source: "provided" });
    const url = new URL(requestedUrl);
    expect(url.searchParams.get("id")).toBe("1248991");
    expect(url.searchParams.get("units")).toBe("metric");
    expect(result).toMatchObject({ cityName: "Colombo", temperatureC: 29.2, relativeHumidity: 77, windSpeedMps: 3.5 });
  });

  it("turns an upstream error into a safe error without leaking the API key", async () => {
    const provider = new OpenWeatherProvider("do-not-leak", async () => new Response("no", { status: 429 }));
    await expect(provider.getCurrent({ CityCode: "1", CityName: "Test", source: "supplemental" })).rejects.toThrow("OpenWeather request failed (429)");
    await expect(provider.getCurrent({ CityCode: "1", CityName: "Test", source: "supplemental" })).rejects.not.toThrow("do-not-leak");
  });

  it("requests nearby weather with coordinates and metric units", async () => {
    let requestedUrl = "";
    const provider = new OpenWeatherProvider("secret-key", async (input) => {
      requestedUrl = input.toString();
      return new Response(JSON.stringify({
        id: 1248991,
        name: "Colombo",
        weather: [{ description: "clear sky", icon: "01d" }],
        main: { temp: 29, feels_like: 31, humidity: 70, pressure: 1009 },
        wind: { speed: 2 },
        dt: 1787734800,
        sys: { country: "LK" },
      }));
    });

    await provider.getCurrentAt({ latitude: 6.93, longitude: 79.86 });
    const url = new URL(requestedUrl);
    expect(url.searchParams.get("lat")).toBe("6.93");
    expect(url.searchParams.get("lon")).toBe("79.86");
    expect(url.searchParams.get("units")).toBe("metric");
  });

  it("invokes platform fetch with the global receiver required by Cloudflare Workers", async () => {
    const platformFetch = async function (this: unknown) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return new Response(JSON.stringify({
        id: 1248991,
        name: "Colombo",
        weather: [{ description: "clear sky", icon: "01d" }],
        main: { temp: 29, feels_like: 31, humidity: 70, pressure: 1009 },
        wind: { speed: 2 },
        dt: 1787734800,
        sys: { country: "LK" },
      }));
    } as typeof fetch;

    const provider = new OpenWeatherProvider("secret-key", platformFetch);
    await expect(provider.getCurrent({ CityCode: "1248991", CityName: "Colombo", source: "provided" })).resolves.toMatchObject({ cityName: "Colombo" });
  });
});
