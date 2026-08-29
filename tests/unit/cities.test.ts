// The city catalog is product configuration, so these checks prevent duplicate
// IDs, missing names and accidental loss of supplied records.
import rawCities from "../../cities.json";
import { cities } from "../../src/data/cities";

describe("configured city dataset", () => {
  it("parses at least ten unique OpenWeather CityCode values", () => {
    const codes = cities.map((city) => city.CityCode);

    expect(cities.length).toBeGreaterThanOrEqual(10);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => /^\d+$/.test(code))).toBe(true);
    expect(cities.every((city) => city.CityName.trim().length > 0)).toBe(true);
  });

  it("preserves all supplied cities and labels additions transparently", () => {
    const supplied = rawCities.List.filter((city) => city.source === "provided");
    const supplemental = rawCities.List.filter((city) => city.source === "supplemental");

    expect(supplied).toHaveLength(8);
    expect(supplemental).toHaveLength(4);
    expect(cities.filter((city) => city.source === "provided")).toHaveLength(supplied.length);
  });
});
