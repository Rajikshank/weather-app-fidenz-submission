import { Droplets, Haze, Wind } from "lucide-react";
import type { ScoredWeather } from "../../shared/contracts";
import { FactorProfileChart } from "./FactorProfileChart";

/** Explains how the ideal baseline is reduced to the selected observation's score. */
export function ScoreBreakdown({ city }: { city: ScoredWeather }) {
  return (
    <section className="breakdown" aria-labelledby="breakdown-title">
      <div className="section-heading section-heading--compact">
        <div><p className="eyebrow">Transparent model</p><h2 id="breakdown-title">Why {city.score}?</h2></div>
        <span className={`cache-pill cache-pill--${city.cacheStatus.toLowerCase()}`}>{city.cacheStatus} · {city.cacheAgeSeconds}s</span>
      </div>
      <FactorProfileChart key={city.cityId} factors={city.factors} />
      <div className="waterfall" aria-label={`Ideal baseline 100, deductions produce final score ${city.score}`}>
        <div><span>Ideal environmental baseline</span><strong>100</strong></div>
        {city.factors.map((factor) => (
          <div key={factor.key}>
            <span>{factor.key === "moisture" ? <Droplets size={16} /> : factor.key === "clarity" ? <Haze size={16} /> : <Wind size={16} />}{factor.label}</span>
            <strong>−{factor.deduction}</strong>
          </div>
        ))}
        <div className="waterfall__total"><span>Ocular Comfort</span><strong>{city.score}</strong></div>
      </div>
      <p className="model-note">Weights express engineering confidence in environmental evidence. They are not medical or diagnostic thresholds.</p>
    </section>
  );
}
