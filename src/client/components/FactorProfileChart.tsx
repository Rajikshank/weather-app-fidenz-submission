import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import type { ComfortFactor } from "../../domain/comfort/comfort.types";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

/** Turns the model's normalized factor stresses into a compact explanatory chart. */
export function FactorProfileChart({ factors }: { factors: ComfortFactor[] }) {
  const reducedMotion = usePrefersReducedMotion();
  const data = factors.map((factor) => ({ ...factor, stressPercent: Math.round(factor.stress * 100) }));
  return (
    <div className="factor-chart" aria-label="Environmental stress profile">
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 42, bottom: 4, left: 0 }}
        responsive
        style={{ width: "100%", height: 128 }}
        title="Selected city environmental stress profile"
        desc="Each environmental factor is shown from zero to one hundred percent stress."
      >
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis type="category" dataKey="label" width={110} axisLine={false} tickLine={false} tick={{ fill: "var(--foreground-muted)", fontSize: 11 }} />
        {/* Preserve a visible marker for an exact 0% result without changing its model value. */}
        <Bar dataKey="stressPercent" minPointSize={4} radius={[0, 7, 7, 0]} background={{ fill: "var(--chart-track)", radius: 7 }} isAnimationActive={!reducedMotion} animationDuration={600} animationEasing="ease-out">
          {data.map((factor) => <Cell className={`factor-bar--${factor.key}`} key={factor.key} fill={factor.key === "moisture" ? "var(--stress-moisture)" : factor.key === "airflow" ? "var(--stress-airflow)" : "var(--primary)"} />)}
          <LabelList dataKey="stressPercent" position="right" formatter={(value: unknown) => `${String(value)}%`} fill="var(--foreground)" fontFamily="IBM Plex Mono" fontSize={10} />
        </Bar>
      </BarChart>
    </div>
  );
}
