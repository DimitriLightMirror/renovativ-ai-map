/**
 * dpe.ts — Dutch energielabel scale (branch `netherlands`).
 *
 * The official Dutch energielabel runs from A+++ (best) to G (worst) and is
 * based on energy performance only (NTA 8800: energy demand, primary fossil
 * energy, renewable share). There is NO separate CO2 label in the Dutch
 * system, unlike the French DPE.
 *
 * Mapping onto the shared A..G EnergyLabel contract (src/types/index.ts is
 * read-only): A+++, A++, A+ and A all collapse onto class 'A'; B..G map
 * one-to-one. The EP thresholds below approximate the Dutch energy-index
 * boundaries expressed in kWhEP/m2/yr (EI 1.0 is roughly 100-110 kWh/m2):
 *   A (incl. A+/A++/A+++) <= 120, B <= 165, C <= 205, D <= 250,
 *   E <= 300, F <= 360, G > 360.
 *
 * The GES thresholds are calibrated so that the worst-of convention below
 * (kept from the shared engine for app compatibility) tracks the EP-based
 * Dutch label for the gas-dominated Dutch stock: they are the EP bounds
 * multiplied by the Dutch natural gas content (~0.21 kgCO2/kWhEP).
 */

import type { EnergyLabel } from '../types';

const LABELS: EnergyLabel[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

/** Upper bounds per label, kWhEP/m2/yr (above => next label). Dutch mapping. */
const EP_THRESHOLDS: readonly number[] = [120, 165, 205, 250, 300, 360];

/** Upper bounds per label, kgCO2/m2/yr (gas-calibrated, see header). */
const GES_THRESHOLDS: readonly number[] = [25, 35, 43, 53, 63, 76];

/**
 * Display colors following the official Dutch energielabel ramp, dark green
 * (A, covering A++/A+/A) to red (G). Class names in CSS stay dpe-a..dpe-g.
 */
const LABEL_COLORS: Record<EnergyLabel, string> = {
  A: '#0a7d33',
  B: '#4ab03a',
  C: '#a6c835',
  D: '#f6d511',
  E: '#f0a41a',
  F: '#e36a1b',
  G: '#d1231f',
};

function labelFromThresholds(value: number, thresholds: readonly number[]): EnergyLabel {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return LABELS[i];
  }
  return 'G';
}

/** Energy label for a consumption in kWhEP/m2/yr (Dutch scale). */
export function labelFromEp(ep: number): EnergyLabel {
  return labelFromThresholds(ep, EP_THRESHOLDS);
}

/** CO2 label for emissions in kgCO2/m2/yr (engine parity, see header). */
export function labelFromGes(ges: number): EnergyLabel {
  return labelFromThresholds(ges, GES_THRESHOLDS);
}

/** Numeric rank of a label: A = 0 ... G = 6. */
export function labelRank(label: EnergyLabel): number {
  return LABELS.indexOf(label);
}

/**
 * Final label: the worst of energy and CO2. Kept for engine compatibility;
 * with the gas-calibrated GES thresholds this coincides with the EP-based
 * Dutch label for the dominant gas-heated stock.
 */
export function finalLabel(epLabel: EnergyLabel, gesLabel: EnergyLabel): EnergyLabel {
  return labelRank(epLabel) >= labelRank(gesLabel) ? epLabel : gesLabel;
}

/** Final label computed directly from the indicators. */
export function labelFromIndicators(ep: number, ges: number): EnergyLabel {
  return finalLabel(labelFromEp(ep), labelFromGes(ges));
}

/** Display color (official Dutch dark-green-to-red ramp). */
export function labelColor(label: EnergyLabel): string {
  return LABEL_COLORS[label];
}
