/**
 * comfort.ts — indicateur de confort d'ete (degres-heures d'inconfort, DH).
 * Classification RE2020 : bulles vert / jaune / orange / rouge.
 */

import type { Building } from '../types';

export type ComfortLevel =
  | 'confortable'
  | 'inconfort_modere'
  | 'inconfort_fort'
  | 'inconfort_severe';

export interface ComfortClassification {
  level: ComfortLevel;
  /** Libelle francais affichable. */
  label: string;
  /** Couleur de la bulle (vert -> rouge). */
  color: string;
}

/** Les trois horizons climatiques classes. */
export interface ComfortHorizons {
  h2025: ComfortClassification;
  h2050: ComfortClassification;
  h2100: ComfortClassification;
}

const CLASSIFICATIONS: Record<ComfortLevel, { label: string; color: string }> = {
  confortable: { label: 'Confortable', color: '#2E9E5B' },
  inconfort_modere: { label: 'Inconfort modéré', color: '#E3C41C' },
  inconfort_fort: { label: 'Inconfort fort', color: '#E8842C' },
  inconfort_severe: { label: 'Inconfort sévère', color: '#D0342C' },
};

/** Seuils RE2020 en degres-heures d'inconfort. */
export function classifyDh(dh: number): ComfortClassification {
  let level: ComfortLevel;
  if (dh <= 600) level = 'confortable';
  else if (dh <= 1250) level = 'inconfort_modere';
  else if (dh <= 2500) level = 'inconfort_fort';
  else level = 'inconfort_severe';
  return { level, ...CLASSIFICATIONS[level] };
}

/** Classe les degres-heures du batiment aux trois horizons 2025 / 2050 / 2100. */
export function comfortForHorizons(building: Building): ComfortHorizons {
  return {
    h2025: classifyDh(building.comfort.dh2025),
    h2050: classifyDh(building.comfort.dh2050),
    h2100: classifyDh(building.comfort.dh2100),
  };
}
