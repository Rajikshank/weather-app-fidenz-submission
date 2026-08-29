/**
 * These are transparent engineering normalization anchors, not clinical
 * thresholds. Keeping the identifier beside the scoring constants ensures the
 * API, domain result and diagnostics always describe the same model.
 */
export const ALGORITHM_ID = "ocular-baseline" as const;

export const COMFORT_CONFIG = {
  // The weights sum to one, so the final score always remains on a 0-100 scale.
  weights: { moisture: 0.70, airflow: 0.20, clarity: 0.10 },
  moisture: { comfortableRh: 55, dryRh: 20, warmReferenceC: 22, warmRangeC: 18 },
  airflow: { calmMps: 1, highMps: 8 },
  clarity: { clearVisibilityM: 10_000, poorVisibilityM: 2_000 },
} as const;
