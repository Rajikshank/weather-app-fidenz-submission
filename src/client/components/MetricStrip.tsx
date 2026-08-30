import { Droplets, Eye, Thermometer, Wind } from "lucide-react";
import type { ScoredWeather } from "../../shared/contracts";

/** Shows every live reading used by the comfort calculation. */
export function MetricStrip({ city }: { city: ScoredWeather }) {
  const visibilityKm = city.visibilityM === null ? null : city.visibilityM / 1_000;
  const metrics = [
    { label: "Temperature", value: `${Math.round(city.temperatureC)}°C`, detail: `Feels ${Math.round(city.feelsLikeC)}°`, icon: Thermometer },
    { label: "Humidity", value: `${city.relativeHumidity}%`, detail: `Dew point ${city.dewPointC}°`, icon: Droplets },
    { label: "Wind", value: `${city.windSpeedMps.toFixed(1)} m/s`, detail: city.windSpeedMps < 3 ? "Gentle airflow" : "Active airflow", icon: Wind },
    {
      label: "Visibility",
      value: visibilityKm === null ? "Unavailable" : visibilityKm >= 10 ? "10+ km" : `${visibilityKm.toFixed(1)} km`,
      detail: visibilityKm === null ? "Assumed clear for scoring" : visibilityKm >= 10 ? "Clear-range visibility" : "Reduced visibility",
      icon: Eye,
    },
  ];
  return (
    <dl className="metric-strip">
      {metrics.map(({ label, value, detail, icon: Icon }) => (
        <div key={label}><dt><Icon size={16} />{label}</dt><dd>{value}<small>{detail}</small></dd></div>
      ))}
    </dl>
  );
}
