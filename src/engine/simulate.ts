/**
 * simulate.ts — simulation of a multi-gesture scenario and suggestion of the
 * best works package (the recommended scenario of the ranked gesture chart).
 * Reductions combine multiplicatively, capped at 90 %.
 */

import type {
  Building,
  EnergyLabel,
  OptimizationObjective,
  RenovationGesture,
} from '../types';
import { GESTURES_UK } from '../content/gestures-uk';
import { finalLabel, labelFromEp, labelFromGes } from './dpe';
import {
  ENERGY_PRICE_GBP_PER_KWH,
  MAX_COMBINED_REDUCTION,
  estimateCost,
  evaluateApplicability,
  paybackYears,
  rankGestures,
} from './scenarios';

export interface SimulationResult {
  /** Selected gestures (requested ids, excluding auto-added required gestures). */
  gestureIds: string[];
  newEp: number;
  newGes: number;
  newLabel: EnergyLabel;
  newGesLabel: EnergyLabel;
  newDh2025: number;
  newDh2050: number;
  newDh2100: number;
  totalCost: number;
  totalAnnualSaving: number;
  paybackYears: number;
}

/** Maximum number of gestures in a suggested package. */
export const MAX_PACKAGE_GESTURES = 4;

/** Expands the id list by adding required gestures, without duplicates. */
function expandWithRequires(gestureIds: string[]): RenovationGesture[] {
  const picked: RenovationGesture[] = [];
  const seen = new Set<string>();
  const push = (id: string): void => {
    if (seen.has(id)) return;
    const gesture = GESTURES_UK.find((g) => g.id === id);
    if (!gesture) return;
    seen.add(id);
    picked.push(gesture);
    gesture.requiresGestureIds.forEach(push);
  };
  gestureIds.forEach(push);
  return picked;
}

/**
 * Simulates the combined application of several gestures on a building.
 * Multiplicative reductions per indicator, 90 % cap.
 */
export function simulateScenario(building: Building, gestureIds: string[]): SimulationResult {
  const gestures = expandWithRequires(gestureIds);

  let epKeep = 1;
  let gesKeep = 1;
  let dhKeep = 1;
  let totalCost = 0;
  for (const g of gestures) {
    epKeep *= 1 - g.epSavingPct;
    gesKeep *= 1 - g.gesSavingPct;
    dhKeep *= 1 - g.dhReductionPct;
    totalCost += estimateCost(building, g);
  }

  const epReduction = Math.min(1 - epKeep, MAX_COMBINED_REDUCTION);
  const gesReduction = Math.min(1 - gesKeep, MAX_COMBINED_REDUCTION);
  const dhReduction = Math.min(1 - dhKeep, MAX_COMBINED_REDUCTION);

  const newEp = building.certificate.ep * (1 - epReduction);
  const newGes = building.certificate.ges * (1 - gesReduction);
  const savedKwhEp = building.annualConsumptionKwhEp * epReduction;
  const totalAnnualSaving = savedKwhEp * ENERGY_PRICE_GBP_PER_KWH;

  return {
    gestureIds,
    newEp,
    newGes,
    newLabel: finalLabel(labelFromEp(newEp), labelFromGes(newGes)),
    newGesLabel: labelFromGes(newGes),
    newDh2025: building.comfort.dh2025 * (1 - dhReduction),
    newDh2050: building.comfort.dh2050 * (1 - dhReduction),
    newDh2100: building.comfort.dh2100 * (1 - dhReduction),
    totalCost,
    totalAnnualSaving,
    paybackYears: paybackYears(totalCost, totalAnnualSaving),
  };
}

export interface PackageSuggestion extends SimulationResult {
  /** true if the provided budget limited the selection. */
  budgetLimited: boolean;
}

/**
 * Suggests the best gesture package for a given objective:
 * greedy walk of the ranking, applicable gestures only, no lot conflict
 * (one gesture per lot, required gestures included), within budget and
 * a maximum of 4 gestures.
 */
export function suggestBestPackage(
  building: Building,
  objective: OptimizationObjective,
  budget?: number,
): PackageSuggestion {
  const ranked = rankGestures(building, objective);
  const pickedIds: string[] = [];
  const usedLots = new Set<string>();
  let spent = 0;

  for (const result of ranked) {
    if (pickedIds.length >= MAX_PACKAGE_GESTURES) break;
    if (!result.applicable) continue;

    const gesture = result.gesture;
    const required = gesture.requiresGestureIds
      .map((id) => GESTURES_UK.find((g) => g.id === id))
      .filter((g): g is RenovationGesture => g !== undefined);

    // Conflict: lot already covered by a picked gesture (or its requirements).
    const lots = [gesture.lot, ...required.map((g) => g.lot)];
    if (lots.some((lot) => usedLots.has(lot))) continue;

    // Required gestures must themselves be applicable.
    if (required.some((g) => !evaluateApplicability(building, g).applicable)) continue;

    // estimatedCost already includes the cost of required gestures.
    if (budget !== undefined && spent + result.estimatedCost > budget) continue;

    pickedIds.push(gesture.id);
    lots.forEach((lot) => usedLots.add(lot));
    spent += result.estimatedCost;
  }

  const simulation = simulateScenario(building, pickedIds);
  return {
    ...simulation,
    budgetLimited:
      budget !== undefined &&
      ranked.some((r) => r.applicable && !pickedIds.includes(r.gesture.id)),
  };
}
