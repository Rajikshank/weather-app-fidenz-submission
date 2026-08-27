export type OcularStateName = "calm" | "watchful" | "elevated" | "stressed" | "severe";

export interface OcularVisualState {
  name: OcularStateName;
  tint: string;
  glow: string;
  tintOpacity: number;
}

/** Maps the public 0–100 score to restrained visualization roles. Terracotta
 * is intentionally used instead of clinical red so low comfort cannot be read
 * as a predicted injury or diagnosis. */
export function getOcularVisualState(score: number): OcularVisualState {
  const normalizedScore = Math.min(100, Math.max(0, score));
  if (normalizedScore >= 85) return { name: "calm", tint: "oklch(0.69 0.09 165)", glow: "oklch(0.72 0.10 158 / 0.18)", tintOpacity: 0.1 };
  if (normalizedScore >= 70) return { name: "watchful", tint: "oklch(0.73 0.10 145)", glow: "oklch(0.74 0.10 145 / 0.2)", tintOpacity: 0.13 };
  if (normalizedScore >= 50) return { name: "elevated", tint: "oklch(0.76 0.12 82)", glow: "oklch(0.76 0.12 82 / 0.24)", tintOpacity: 0.18 };
  if (normalizedScore >= 30) return { name: "stressed", tint: "oklch(0.69 0.14 58)", glow: "oklch(0.69 0.14 58 / 0.27)", tintOpacity: 0.22 };
  return { name: "severe", tint: "oklch(0.54 0.20 28)", glow: "oklch(0.58 0.19 28 / 0.44)", tintOpacity: 0.43 };
}
