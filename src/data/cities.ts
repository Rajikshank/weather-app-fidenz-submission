import cityData from "../../cities.json";

export interface CityDefinition {
  CityCode: string;
  CityName: string;
  source: "provided" | "supplemental";
}

// Keep the eight provided records distinguishable from the four explicit
// additions so data provenance remains visible after parsing.
export const cities = cityData.List.map(({ CityCode, CityName, source }) => ({
  CityCode,
  CityName,
  source,
})) as CityDefinition[];
