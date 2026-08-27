import { calculateComfort } from "../../src/domain/comfort/calculate-comfort";
import { COMFORT_CONFIG } from "../../src/domain/comfort/comfort.config";

describe("baseline Ocular Comfort algorithm", () => {
  it("returns a transparent, bounded score for a city", () => {
    const result = calculateComfort({ temperatureC: 24, relativeHumidity: 52, windSpeedMps: 2.1 });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.factors).toHaveLength(2);
    expect(result.factors.map((factor) => factor.key)).toEqual(["moisture", "airflow"]);
    expect(result.algorithmVersion).toBe("ocular-baseline");
  });

  it("never rewards drier air under otherwise identical conditions", () => {
    const humid = calculateComfort({ temperatureC: 26, relativeHumidity: 60, windSpeedMps: 2 });
    const dry = calculateComfort({ temperatureC: 26, relativeHumidity: 20, windSpeedMps: 2 });
    expect(dry.score).toBeLessThan(humid.score);
  });

  it("never rewards stronger airflow under otherwise identical conditions", () => {
    const calm = calculateComfort({ temperatureC: 22, relativeHumidity: 50, windSpeedMps: 1 });
    const windy = calculateComfort({ temperatureC: 22, relativeHumidity: 50, windSpeedMps: 9 });
    expect(windy.score).toBeLessThan(calm.score);
  });

  it("uses temperature as a third input when dry air is otherwise identical", () => {
    const coolDry = calculateComfort({ temperatureC: 18, relativeHumidity: 20, windSpeedMps: 1 });
    const hotDry = calculateComfort({ temperatureC: 40, relativeHumidity: 20, windSpeedMps: 1 });

    expect(hotDry.score).toBeLessThan(coolDry.score);
    expect(hotDry.factors.find((factor) => factor.key === "moisture")!.stress)
      .toBeGreaterThan(coolDry.factors.find((factor) => factor.key === "moisture")!.stress);
  });

  it("gives very dry air meaningfully more moisture stress than moderate humidity", () => {
    const veryDry = calculateComfort({ temperatureC: 24, relativeHumidity: 25, windSpeedMps: 2 });
    const moderate = calculateComfort({ temperatureC: 24, relativeHumidity: 45, windSpeedMps: 2 });
    const stress = (result: typeof veryDry) => result.factors.find((factor) => factor.key === "moisture")!.stress;

    expect(stress(veryDry) - stress(moderate)).toBeGreaterThan(0.45);
  });

  it("keeps humidity and wind monotonic across the supported weather range", () => {
    const humidities = [0, 10, 20, 30, 40, 50, 60, 80, 100];
    const winds = [0, 1, 2, 4, 6, 8, 12, 30];

    for (let index = 1; index < humidities.length; index += 1) {
      const drier = calculateComfort({ temperatureC: 26, relativeHumidity: humidities[index - 1]!, windSpeedMps: 2 });
      const wetter = calculateComfort({ temperatureC: 26, relativeHumidity: humidities[index]!, windSpeedMps: 2 });
      expect(wetter.score).toBeGreaterThanOrEqual(drier.score);
    }

    for (let index = 1; index < winds.length; index += 1) {
      const calmer = calculateComfort({ temperatureC: 26, relativeHumidity: 45, windSpeedMps: winds[index - 1]! });
      const windier = calculateComfort({ temperatureC: 26, relativeHumidity: 45, windSpeedMps: winds[index]! });
      expect(windier.score).toBeLessThanOrEqual(calmer.score);
    }
  });

  it("uses normalized weights and keeps factor deductions explainable", () => {
    const result = calculateComfort({ temperatureC: 31, relativeHumidity: 34, windSpeedMps: 5 });

    expect(COMFORT_CONFIG.weights.moisture + COMFORT_CONFIG.weights.airflow).toBe(1);
    for (const factor of result.factors) {
      expect(factor.stress).toBeGreaterThanOrEqual(0);
      expect(factor.stress).toBeLessThanOrEqual(1);
      expect(factor.deduction).toBe(Math.round(100 * factor.weight * factor.stress));
    }
  });

  it.each([
    { temperatureC: Number.NaN, relativeHumidity: Number.NaN, windSpeedMps: Number.NaN },
    { temperatureC: -999, relativeHumidity: -20, windSpeedMps: -10 },
    { temperatureC: 999, relativeHumidity: 400, windSpeedMps: 999 },
  ])("handles extreme or malformed numeric inputs without NaN", (input) => {
    const result = calculateComfort(input);
    expect(Number.isFinite(result.score)).toBe(true);
    expect(Number.isFinite(result.dewPointC)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns neutral environmental labels rather than clinical claims", () => {
    const samples = [
      calculateComfort({ temperatureC: 20, relativeHumidity: 60, windSpeedMps: 1 }),
      calculateComfort({ temperatureC: 24, relativeHumidity: 45, windSpeedMps: 2 }),
      calculateComfort({ temperatureC: 30, relativeHumidity: 35, windSpeedMps: 4 }),
      calculateComfort({ temperatureC: 39, relativeHumidity: 12, windSpeedMps: 10 }),
    ];
    expect(samples.every((sample) => !/safe|unsafe|healthy|dangerous|diagnos/i.test(sample.classification))).toBe(true);
  });
});
