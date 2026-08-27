import { Droplets, Thermometer, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "./BrandMark";

interface OcuLoaderProps {
  message?: string;
  phase?: "auth" | "weather";
}

/** Progress advances toward a phase ceiling but never claims 100%; successful
 * completion is represented truthfully when the loader is replaced by content. */
export function OcuLoader({ message = "Reading the atmosphere…", phase = "weather" }: OcuLoaderProps) {
  const start = phase === "auth" ? 12 : 54;
  const ceiling = phase === "auth" ? 48 : 92;
  const [progress, setProgress] = useState(start);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(ceiling, current + Math.max(1, Math.ceil((ceiling - current) * 0.1))));
    }, 140);
    return () => window.clearInterval(timer);
  }, [ceiling]);

  return (
    <main className="ocu-loader">
      <BrandMark />
      <div className="ocu-loader__sensor">
        <span aria-hidden="true"><Thermometer size={21} /></span>
        <span aria-hidden="true"><Droplets size={21} /></span>
        <span aria-hidden="true"><Wind size={21} /></span>
        <i className="ocu-loader__progress" role="progressbar" aria-label="Loading observations" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <i style={{ width: `${progress}%` }} />
        </i>
      </div>
      <p role="status" aria-live="polite">{message}</p>
    </main>
  );
}
