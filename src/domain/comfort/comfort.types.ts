import type { ALGORITHM_ID } from "./comfort.config";

/** Pure domain input: units are normalized before the scoring engine receives them. */
export interface ComfortInput {
  temperatureC: number;
  relativeHumidity: number;
  windSpeedMps: number;
  /** Optional because older callers can safely use the clear-air default. */
  visibilityM?: number | null;
}

export type ComfortClassification =
  | "Favourable"
  | "Mostly favourable"
  | "Elevated environmental stress"
  | "High environmental stress"
  | "Very high environmental stress";

export interface ComfortFactor {
  key: "moisture" | "airflow" | "clarity";
  label: string;
  stress: number;
  weight: number;
  deduction: number;
  severity: "low" | "moderate" | "high";
}

/** Explainable output shared by ranked and nearby weather observations. */
export interface ComfortResult {
  score: number;
  classification: ComfortClassification;
  dominantFactor: ComfortFactor["key"];
  summary: string;
  dewPointC: number;
  factors: ComfortFactor[];
  algorithmVersion: typeof ALGORITHM_ID;
}
