/**
 * dpe.ts — EPC-flavoured A..G bands (SAP/RdSAP style).
 * Bands on energy use (kWh/m2/year) and CO2 emissions (kgCO2/m2/year).
 * The headline rating is the worse of the two.
 */

import type { EnergyLabel } from '../types';

const LABELS: EnergyLabel[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

/** Upper bounds per band, kWh/m2/year (above => next band). */
const EP_THRESHOLDS: readonly number[] = [45, 90, 140, 190, 260, 340];

/** Upper bounds per band, kgCO2/m2/year. */
const GES_THRESHOLDS: readonly number[] = [10, 20, 40, 60, 85, 115];

/** Rating scale colours, A (green) to G (red). */
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

/** Energy band for a consumption in kWh/m2/year. */
export function labelFromEp(ep: number): EnergyLabel {
  return labelFromThresholds(ep, EP_THRESHOLDS);
}

/** Emissions band for CO2 in kgCO2/m2/year. */
export function labelFromGes(ges: number): EnergyLabel {
  return labelFromThresholds(ges, GES_THRESHOLDS);
}

/** Numeric rank of a band: A = 0 ... G = 6. */
export function labelRank(label: EnergyLabel): number {
  return LABELS.indexOf(label);
}

/** Headline EPC rating: the worse of the energy and emissions bands. */
export function finalLabel(epLabel: EnergyLabel, gesLabel: EnergyLabel): EnergyLabel {
  return labelRank(epLabel) >= labelRank(gesLabel) ? epLabel : gesLabel;
}

/** Headline rating computed directly from the indicators. */
export function labelFromIndicators(ep: number, ges: number): EnergyLabel {
  return finalLabel(labelFromEp(ep), labelFromGes(ges));
}

/** Display colour (EPC-style scale). */
export function labelColor(label: EnergyLabel): string {
  return LABEL_COLORS[label];
}
