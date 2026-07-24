/**
 * dpe.ts — etiquettes DPE 2021 (arrete du 31 mars 2021).
 * Echelle A..G sur l'energie primaire (kWhEP/m2/an) et les GES (kgCO2/m2/an).
 * L'etiquette finale est la plus defavorable des deux.
 */

import type { EnergyLabel } from '../types';

const LABELS: EnergyLabel[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

/** Seuils hauts par etiquette, kWhEP/m2/an (au-dela => etiquette suivante). */
const EP_THRESHOLDS: readonly number[] = [70, 110, 180, 250, 330, 420];

/** Seuils hauts par etiquette, kgCO2/m2/an. */
const GES_THRESHOLDS: readonly number[] = [6, 11, 30, 50, 70, 100];

/** Couleurs officielles de l'echelle DPE, de A (vert) a G (rouge). */
const LABEL_COLORS: Record<EnergyLabel, string> = {
  A: '#319834',
  B: '#33CC31',
  C: '#CBFC34',
  D: '#FBFE06',
  E: '#FBCC0C',
  F: '#FC9935',
  G: '#FD0205',
};

function labelFromThresholds(value: number, thresholds: readonly number[]): EnergyLabel {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return LABELS[i];
  }
  return 'G';
}

/** Etiquette energie primaire pour une consommation en kWhEP/m2/an. */
export function labelFromEp(ep: number): EnergyLabel {
  return labelFromThresholds(ep, EP_THRESHOLDS);
}

/** Etiquette GES pour des emissions en kgCO2/m2/an. */
export function labelFromGes(ges: number): EnergyLabel {
  return labelFromThresholds(ges, GES_THRESHOLDS);
}

/** Rang numerique d'une etiquette : A = 0 ... G = 6. */
export function labelRank(label: EnergyLabel): number {
  return LABELS.indexOf(label);
}

/** Etiquette finale DPE : la plus defavorable entre energie et GES. */
export function finalLabel(epLabel: EnergyLabel, gesLabel: EnergyLabel): EnergyLabel {
  return labelRank(epLabel) >= labelRank(gesLabel) ? epLabel : gesLabel;
}

/** Etiquette finale calculee directement depuis les indicateurs. */
export function labelFromIndicators(ep: number, ges: number): EnergyLabel {
  return finalLabel(labelFromEp(ep), labelFromGes(ges));
}

/** Couleur d'affichage (echelle officielle DPE). */
export function labelColor(label: EnergyLabel): string {
  return LABEL_COLORS[label];
}
