/**
 * comfort.ts — summer comfort indicator (degree-hours of discomfort, DH).
 *
 * Classification calibrated for the Dutch maritime climate: modelled DH
 * values run much lower than in France (dh2025 base 250-800, see
 * scripts/fetch-netherlands.mjs), so the thresholds are shifted down.
 * Note: Dutch regulation uses TOjuli (NTA 8800) instead of degree-hours;
 * this classification is a modelled proxy, not a legal indicator.
 */

import type { Building } from '../types';

export type ComfortLevel =
  | 'confortable'
  | 'inconfort_modere'
  | 'inconfort_fort'
  | 'inconfort_severe';

export interface ComfortClassification {
  level: ComfortLevel;
  /** Displayable English label. */
  label: string;
  /** Bubble color (green -> red). */
  color: string;
}

/** The three climate horizons, classified. */
export interface ComfortHorizons {
  h2025: ComfortClassification;
  h2050: ComfortClassification;
  h2100: ComfortClassification;
}

const CLASSIFICATIONS: Record<ComfortLevel, { label: string; color: string }> = {
  confortable: { label: 'Comfortable', color: '#2E9E5B' },
  inconfort_modere: { label: 'Moderate discomfort', color: '#E3C41C' },
  inconfort_fort: { label: 'High discomfort', color: '#E8842C' },
  inconfort_severe: { label: 'Severe discomfort', color: '#D0342C' },
};

/** Thresholds in degree-hours of discomfort, Dutch maritime calibration. */
export function classifyDh(dh: number): ComfortClassification {
  let level: ComfortLevel;
  if (dh <= 400) level = 'confortable';
  else if (dh <= 800) level = 'inconfort_modere';
  else if (dh <= 1600) level = 'inconfort_fort';
  else level = 'inconfort_severe';
  return { level, ...CLASSIFICATIONS[level] };
}

/** Classify the building's degree-hours at the 2025 / 2050 / 2100 horizons. */
export function comfortForHorizons(building: Building): ComfortHorizons {
  return {
    h2025: classifyDh(building.comfort.dh2025),
    h2050: classifyDh(building.comfort.dh2050),
    h2100: classifyDh(building.comfort.dh2100),
  };
}
