import type { CSSProperties } from "react";
import type { ComfortFactor } from "../../domain/comfort/comfort.types";
import { getOcularVisualState, type OcularStateName } from "./ocular-visual-state";

interface OcularPulseProps { score: number; factors: ComfortFactor[]; cityName: string; classification: string }

export function OcularPulse({ score, factors, cityName, classification }: OcularPulseProps) {
  const moisture = factors.find((factor) => factor.key === "moisture")?.stress ?? 0;
  const airflow = factors.find((factor) => factor.key === "airflow")?.stress ?? 0;
  const visualState = getOcularVisualState(score);
  const ambientOpacity = Math.min(0.82, 0.46 + Math.max(moisture, airflow) * 0.28);
  const eyeStyle = {
    "--iris-tint": visualState.tint,
    "--iris-glow": visualState.glow,
    "--iris-opacity": visualState.tintOpacity,
    "--ambient-opacity": ambientOpacity,
    "--ambient-low-opacity": ambientOpacity * 0.72,
  } as CSSProperties;
  return (
    <figure className="ocular-pulse" aria-label={`${cityName} Ocular Environment Pulse: score ${score} out of 100`}>
      <div className="ocular-stage">
        {/* Only the iris and its ambient field receive semantic color. The
            generated eyelid and sclera remain untouched and anatomically calm. */}
        <div className="eye-visual" data-eye-state={visualState.name} style={eyeStyle}>
          <span className="eye-visual__ambient" aria-hidden="true" />
          <span className="eye-visual__iris-aura" aria-hidden="true" />
          <img src="/assets/ocular-eye-v3.webp" alt="" />
          <span className="eye-visual__iris-tint" aria-hidden="true" />
        </div>
        <div className="score-pod" key={score} aria-label={`Comfort score ${score} out of 100, ${classification}`} style={{ "--score-progress": `${score}%` } as CSSProperties}>
          <span>Comfort</span>
          <strong>{score}</strong>
          <small>/ 100</small>
          <i aria-hidden="true"><i /></i>
          {/* The nearby copy already names the classification. A calibrated
              five-tick scale adds state without introducing another label. */}
          <ComfortSpectrum state={visualState.name} />
        </div>
      </div>
      <figcaption className="stress-readout">
        <StressMeter label="Moisture" value={moisture} className="moisture" />
        <StressMeter label="Airflow" value={airflow} className="airflow" />
      </figcaption>
    </figure>
  );
}

function ComfortSpectrum({ state }: { state: OcularStateName }) {
  const activeIndex = { severe: 0, stressed: 1, elevated: 2, watchful: 3, calm: 4 }[state];
  return (
    <span className="score-pod__spectrum" data-state={state} aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <i className={index === activeIndex ? "score-pod__tick--active" : undefined} key={index} />
      ))}
    </span>
  );
}

function StressMeter({ label, value, className }: { label: string; value: number; className: string }) {
  const percentage = Math.round(value * 100);
  return (
    <span className={`stress-meter stress-meter--${className}`}>
      <span><b>{label}</b><small>{percentage}% stress</small></span>
      <i aria-hidden="true"><i style={{ width: `${percentage}%` }} /></i>
    </span>
  );
}
