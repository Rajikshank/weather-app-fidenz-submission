import { ALGORITHM_ID, COMFORT_CONFIG } from "./comfort.config";
import type { ComfortClassification, ComfortFactor, ComfortInput, ComfortResult } from "./comfort.types";

const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

/** Magnus approximation: useful environmental context, never a clinical metric. */
const calculateDewPoint = (temperatureC: number, relativeHumidity: number) => {
  const humidity = clamp(relativeHumidity, 1, 100);
  const alpha = Math.log(humidity / 100) + (17.625 * temperatureC) / (243.04 + temperatureC);
  return (243.04 * alpha) / (17.625 - alpha);
};

const classify = (score: number): ComfortClassification => {
  if (score >= 85) return "Favourable";
  if (score >= 70) return "Mostly favourable";
  if (score >= 50) return "Elevated environmental stress";
  if (score >= 30) return "High environmental stress";
  return "Very high environmental stress";
};

const severity = (stress: number): ComfortFactor["severity"] =>
  stress >= 0.66 ? "high" : stress >= 0.33 ? "moderate" : "low";

/**
 * Pure domain boundary: no HTTP, framework, cache, authentication or UI.
 * Formula changes therefore remain small and independently testable.
 */
export function calculateComfort(input: ComfortInput): ComfortResult {
  const temperatureC = clamp(input.temperatureC, -60, 60);
  const relativeHumidity = clamp(input.relativeHumidity, 0, 100);
  const windSpeedMps = clamp(input.windSpeedMps, 0, 75);

  const humidityStress = clamp(
    (COMFORT_CONFIG.moisture.comfortableRh - relativeHumidity) /
      (COMFORT_CONFIG.moisture.comfortableRh - COMFORT_CONFIG.moisture.dryRh),
  );
  // Warm air can carry more moisture, so it slightly amplifies an already-dry environment.
  const warmDrynessModifier = clamp(
    (temperatureC - COMFORT_CONFIG.moisture.warmReferenceC) / COMFORT_CONFIG.moisture.warmRangeC,
  );
  const moistureStress = clamp(humidityStress * (0.9 + 0.1 * warmDrynessModifier));
  const airflowStress = clamp(
    (windSpeedMps - COMFORT_CONFIG.airflow.calmMps) /
      (COMFORT_CONFIG.airflow.highMps - COMFORT_CONFIG.airflow.calmMps),
  );

  const factors: ComfortFactor[] = [
    {
      key: "moisture",
      label: "Moisture balance",
      stress: moistureStress,
      weight: COMFORT_CONFIG.weights.moisture,
      deduction: Math.round(100 * COMFORT_CONFIG.weights.moisture * moistureStress),
      severity: severity(moistureStress),
    },
    {
      key: "airflow",
      label: "Airflow",
      stress: airflowStress,
      weight: COMFORT_CONFIG.weights.airflow,
      deduction: Math.round(100 * COMFORT_CONFIG.weights.airflow * airflowStress),
      severity: severity(airflowStress),
    },
  ];

  const environmentalStress = factors.reduce((sum, factor) => sum + factor.stress * factor.weight, 0);
  const score = Math.round(100 * (1 - clamp(environmentalStress)));
  const dominant = factors.reduce((current, factor) =>
    factor.deduction > current.deduction ? factor : current,
  );

  return {
    score,
    classification: classify(score),
    dominantFactor: dominant.key,
    summary:
      dominant.key === "moisture"
        ? "Dry air is the strongest environmental factor right now."
        : "Moving air is the strongest environmental factor right now.",
    dewPointC: Number(calculateDewPoint(temperatureC, relativeHumidity).toFixed(1)),
    factors,
    algorithmVersion: ALGORITHM_ID,
  };
}
