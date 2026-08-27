import type { CSSProperties } from "react";
import type { ComfortFactor } from "../../domain/comfort/comfort.types";
import { getOcularVisualState } from "./ocular-visual-state";

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
          {/* The nearby copy already names the classification. This compact,
              non-verbal signal keeps the pod informative without repeating it. */}
          <ComfortSignal state={visualState.name} />
        </div>
      </div>
      <figcaption className="stress-readout">
        <StressMeter label="Moisture" value={moisture} className="moisture" />
        <StressMeter label="Airflow" value={airflow} className="airflow" />
      </figcaption>
    </figure>
  );
}

function ComfortSignal({ state }: { state: string }) {
  return (
    <span className="score-pod__signal" data-state={state} aria-hidden="true">
      <svg viewBox="0 0 40 24" focusable="false">
        <path className="score-pod__orbit" d="M3 12C8 4 32 4 37 12C32 20 8 20 3 12Z" />
        <path className="score-pod__wave" d="M7 12c3-5 5 5 8 0s5-5 8 0 5 5 10 0" />
        <circle cx="20" cy="12" r="2.7" />
      </svg>
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
