import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import type { RankedCity } from "../../shared/contracts";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

function shortCityName(name: string) {
  return name.length > 15 ? `${name.slice(0, 14)}…` : name;
}

/** Compares only configured cities; a nearby observation stays unranked. */
export function CityComparisonChart({ cities, selectedId }: { cities: RankedCity[]; selectedId: string }) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <section className="chart-card comparison-card" aria-labelledby="comparison-title">
      <div className="section-heading section-heading--flush">
        <div>
          <p className="eyebrow">Cross-city signal</p>
          <h2 id="comparison-title">Comfort landscape</h2>
        </div>
        <span className="scale-label">0–100 index</span>
      </div>
      <p className="section-description">A common scale makes the current ranking and outliers immediately visible.</p>
      <div className="comparison-chart">
        <BarChart
          accessibilityLayer
          data={cities}
          layout="vertical"
          margin={{ top: 8, right: 36, bottom: 8, left: 0 }}
          responsive
          style={{ width: "100%", height: Math.max(390, cities.length * 34) }}
          title="Comfort score comparison for twelve cities"
          desc="Horizontal bars compare each city on the same zero to one hundred comfort scale."
        >
          <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
          <XAxis type="number" domain={[0, 100]} tickCount={5} axisLine={false} tickLine={false} tick={{ fill: "var(--foreground-subtle)", fontSize: 10 }} />
          <YAxis type="category" dataKey="cityName" width={112} axisLine={false} tickLine={false} tickFormatter={shortCityName} tick={{ fill: "var(--foreground-muted)", fontSize: 11 }} />
          <Tooltip cursor={{ fill: "var(--chart-hover)" }} formatter={(value) => [`${String(value)} / 100`, "Comfort"]} />
          <Bar dataKey="score" radius={[0, 7, 7, 0]} isAnimationActive={!reducedMotion} animationBegin={80} animationDuration={650} animationEasing="ease-out">
            {cities.map((city) => <Cell key={city.cityId} fill={city.cityId === selectedId ? "var(--chart-selected)" : "var(--chart-bar)"} />)}
            <LabelList dataKey="score" position="right" fill="var(--foreground)" fontFamily="IBM Plex Mono" fontSize={10} />
          </Bar>
        </BarChart>
      </div>
    </section>
  );
}
