/**
 * simulate.ts — simulation d'un scenario multi-gestes et suggestion du
 * meilleur paquet de travaux (le scenario recommande du chapelet).
 * Les reductions se combinent de facon multiplicative, plafonnees a 90 %.
 * Le corpus de gestes, le prix de l'energie et le profil de bandes sont
 * regionaux, avec defauts France preserves.
 */

import type {
  Building,
  EnergyLabel,
  OptimizationObjective,
  RenovationGesture,
} from '../types';
import { GESTURES_FR } from '../content/gestures-fr';
import { labelFromIndicators, labelFromGes, type EngineProfile } from './dpe';
import {
  ENERGY_PRICE_EUR_PER_KWH,
  MAX_COMBINED_REDUCTION,
  estimateCost,
  evaluateApplicability,
  paybackYears,
  rankGestures,
  type EngineOptions,
} from './scenarios';

export interface SimulationResult {
  /** Gestes retenus (ids demandes, hors gestes requis auto-ajoutes). */
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

/** Nombre maximal de gestes dans un paquet suggere. */
export const MAX_PACKAGE_GESTURES = 4;

/** Developpe la liste d'ids en ajoutant les gestes requis, sans doublon. */
function expandWithRequires(
  gestureIds: string[],
  allGestures: RenovationGesture[],
): RenovationGesture[] {
  const picked: RenovationGesture[] = [];
  const seen = new Set<string>();
  const push = (id: string): void => {
    if (seen.has(id)) return;
    const gesture = allGestures.find((g) => g.id === id);
    if (!gesture) return;
    seen.add(id);
    picked.push(gesture);
    gesture.requiresGestureIds.forEach(push);
  };
  gestureIds.forEach(push);
  return picked;
}

interface ResolvedEngine {
  gestures: RenovationGesture[];
  energyPrice: number;
  profile: EngineProfile;
}

function resolve(options: EngineOptions): ResolvedEngine {
  return {
    gestures: options.gestures ?? GESTURES_FR,
    energyPrice: options.energyPrice ?? ENERGY_PRICE_EUR_PER_KWH,
    profile: options.profile ?? 'fr',
  };
}

/**
 * Simule l'application combinee de plusieurs gestes sur un batiment.
 * Reductions multiplicatives par indicateur, plafond de 90 %.
 */
export function simulateScenario(
  building: Building,
  gestureIds: string[],
  options: EngineOptions = {},
): SimulationResult {
  const { gestures, energyPrice, profile } = resolve(options);
  const picked = expandWithRequires(gestureIds, gestures);

  let epKeep = 1;
  let gesKeep = 1;
  let dhKeep = 1;
  let totalCost = 0;
  for (const g of picked) {
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
  const totalAnnualSaving = savedKwhEp * energyPrice;

  return {
    gestureIds,
    newEp,
    newGes,
    newLabel: labelFromIndicators(newEp, newGes, profile),
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
  /** true si le budget fourni a limite la selection. */
  budgetLimited: boolean;
}

/**
 * Suggere le meilleur paquet de gestes pour un objectif donne :
 * parcours glouton du classement, gestes applicables uniquement, sans
 * conflit de lot (un seul geste par lot, gestes requis compris),
 * dans la limite du budget et de 4 gestes maximum.
 */
export function suggestBestPackage(
  building: Building,
  objective: OptimizationObjective,
  budget?: number,
  options: EngineOptions = {},
): PackageSuggestion {
  const { gestures } = resolve(options);
  const ranked = rankGestures(building, objective, options);
  const pickedIds: string[] = [];
  const usedLots = new Set<string>();
  let spent = 0;

  for (const result of ranked) {
    if (pickedIds.length >= MAX_PACKAGE_GESTURES) break;
    if (!result.applicable) continue;

    const gesture = result.gesture;
    const required = gesture.requiresGestureIds
      .map((id) => gestures.find((g) => g.id === id))
      .filter((g): g is RenovationGesture => g !== undefined);

    // Conflit : lot deja couvert par un geste retenu (ou ses requis).
    const lots = [gesture.lot, ...required.map((g) => g.lot)];
    if (lots.some((lot) => usedLots.has(lot))) continue;

    // Les gestes requis doivent eux aussi etre applicables.
    if (required.some((g) => !evaluateApplicability(building, g).applicable)) continue;

    // estimatedCost inclut deja le cout des gestes requis.
    if (budget !== undefined && spent + result.estimatedCost > budget) continue;

    pickedIds.push(gesture.id);
    lots.forEach((lot) => usedLots.add(lot));
    spent += result.estimatedCost;
  }

  const simulation = simulateScenario(building, pickedIds, options);
  return {
    ...simulation,
    budgetLimited:
      budget !== undefined &&
      ranked.some((r) => r.applicable && !pickedIds.includes(r.gesture.id)),
  };
}
