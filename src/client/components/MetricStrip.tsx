import { Droplets, Thermometer, Wind } from "lucide-react";
import type { ScoredWeather } from "../../shared/contracts";

/** Shows the primary readings in the dashboard; visibility is explained in the score breakdown. */
export function MetricStrip({ city }: { city: ScoredWeather }) {
  const metrics = [
    { label: "Temperature", value: `${Math.round(city.temperatureC)}°C`, detail: `Feels ${Math.round(city.feelsLikeC)}°`, icon: Thermometer },
    { label: "Humidity", value: `${city.relativeHumidity}%`, detail: `Dew point ${city.dewPointC}°`, icon: Droplets },
    { label: "Wind", value: `${city.windSpeedMps.toFixed(1)} m/s`, detail: city.windSpeedMps < 3 ? "Gentle airflow" : "Active airflow", icon: Wind },
  ];
  return (
    <dl className="metric-strip">
      {metrics.map(({ label, value, detail, icon: Icon }) => (
        <div key={label}><dt><Icon size={16} />{label}</dt><dd>{value}<small>{detail}</small></dd></div>
      ))}
    </dl>
  );
}
