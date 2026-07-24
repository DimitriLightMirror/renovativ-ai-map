/**
 * comfort.ts — summer comfort indicator (degree-hours of indoor overheating, DH).
 * Classification: green / yellow / orange / red bubbles.
 * Shared DH scale across branches; on the usa branch the classification is
 * presented as NOAA/NWS-style heat readiness levels.
 */

import type { Building } from '../types';

export type ComfortLevel =
  | 'confortable'
  | 'inconfort_modere'
  | 'inconfort_fort'
  | 'inconfort_severe';

export interface ComfortClassification {
  level: ComfortLevel;
  /** Display label (English on the usa branch). */
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

/** Degree-hour thresholds (shared scale across branches). */
export function classifyDh(dh: number): ComfortClassification {
  let level: ComfortLevel;
  if (dh <= 600) level = 'confortable';
  else if (dh <= 1250) level = 'inconfort_modere';
  else if (dh <= 2500) level = 'inconfort_fort';
  else level = 'inconfort_severe';
  return { level, ...CLASSIFICATIONS[level] };
}

/** Classifies the building's degree-hours at the 2025 / 2050 / 2100 horizons. */
export function comfortForHorizons(building: Building): ComfortHorizons {
  return {
    h2025: classifyDh(building.comfort.dh2025),
    h2050: classifyDh(building.comfort.dh2050),
    h2100: classifyDh(building.comfort.dh2100),
  };
}
