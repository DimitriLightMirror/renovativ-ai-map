/**
 * dpe.ts — HERS-style energy rating bands (usa branch).
 *
 * The `ep` field of the certificate carries a HERS-style index score on this
 * branch, not kWhEP/m2/an. HERS mapping (RESNET convention):
 *   100 = energy use of the 2006 IECC reference new home,
 *   0   = net zero energy home,
 *   typical existing US homes score 120 to 150.
 * The A..G display bands below are a Renovativ presentation scale over that
 * index, chosen so that a 2006-code new home lands in class D and deep
 * retrofits reach A/B:
 *   A <= 55, B <= 70, C <= 85, D <= 100, E <= 115, F <= 130, G > 130.
 *
 * GES bands (kgCO2/m2/an) are tuned to the US stock and grid mix, which is
 * more carbon-intensive than the French one. The final label stays the worse
 * of the two, exactly as on the France branch.
 */

import type { EnergyLabel } from '../types';

const LABELS: EnergyLabel[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

/** Upper band edges per label, HERS-style index points (above => next label). */
const EP_THRESHOLDS: readonly number[] = [55, 70, 85, 100, 115, 130];

/** Upper band edges per label, kgCO2/m2/an (US stock and grid mix). */
const GES_THRESHOLDS: readonly number[] = [8, 15, 25, 40, 60, 90];

/** Display colors of the A (green) to G (red) scale, same as the France branch. */
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

/** Energy label for a HERS-style index score. */
export function labelFromEp(ep: number): EnergyLabel {
  return labelFromThresholds(ep, EP_THRESHOLDS);
}

/** Climate label for emissions in kgCO2/m2/an. */
export function labelFromGes(ges: number): EnergyLabel {
  return labelFromThresholds(ges, GES_THRESHOLDS);
}

/** Numeric rank of a label: A = 0 ... G = 6. */
export function labelRank(label: EnergyLabel): number {
  return LABELS.indexOf(label);
}

/** Final label: the worse of the energy and climate labels. */
export function finalLabel(epLabel: EnergyLabel, gesLabel: EnergyLabel): EnergyLabel {
  return labelRank(epLabel) >= labelRank(gesLabel) ? epLabel : gesLabel;
}

/** Final label computed directly from the indicators. */
export function labelFromIndicators(ep: number, ges: number): EnergyLabel {
  return finalLabel(labelFromEp(ep), labelFromGes(ges));
}

/** Display color (shared A to G scale). */
export function labelColor(label: EnergyLabel): string {
  return LABEL_COLORS[label];
}
