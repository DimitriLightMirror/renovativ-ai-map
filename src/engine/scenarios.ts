/**
 * scenarios.ts — le "graphique de chapelet".
 * Filtre intelligent d'applicabilite (DSL partage), estimation de cout,
 * classement des gestes de renovation selon l'objectif choisi.
 *
 * DSL d'applicabilite : conditions separees par ';' sur des chemins du
 * batiment (ex. "envelope.wallInsulation=aucune;constructionYear<1975").
 * Operateurs : =, !=, <, >. Le litteral `null` matche null/absent.
 * Chaine vide = toujours applicable.
 */

import type {
  Building,
  EnergyLabel,
  OptimizationObjective,
  RenovationGesture,
  ScenarioResult,
} from '../types';
import { GESTURES_FR } from '../content/gestures-fr';
import { labelFromIndicators, type EngineProfile } from './dpe';

/** Prix de l'energie utilise par defaut pour valoriser les economies, EUR/kWhEP. */
export const ENERGY_PRICE_EUR_PER_KWH = 0.15;

/** Plafond de reduction combinee (90 %) pour eviter les valeurs irrealistes. */
export const MAX_COMBINED_REDUCTION = 0.9;

/**
 * Options regionales du moteur. Par defaut : corpus France, prix francais,
 * bandes DPE. Les regions UK/US passent leur propre corpus et leur devise.
 */
export interface EngineOptions {
  gestures?: RenovationGesture[];
  energyPrice?: number;
  profile?: EngineProfile;
}

function resolveOptions(options: EngineOptions): Required<EngineOptions> {
  return {
    gestures: options.gestures ?? GESTURES_FR,
    energyPrice: options.energyPrice ?? ENERGY_PRICE_EUR_PER_KWH,
    profile: options.profile ?? 'fr',
  };
}

// ---------------------------------------------------------------------------
// Filtre intelligent : evaluation du DSL
// ---------------------------------------------------------------------------

export interface ApplicabilityCheck {
  applicable: boolean;
  /** Raison lisible quand le geste n'est pas applicable, null sinon. */
  reason: string | null;
}

type Primitive = string | number | boolean | null | undefined;

/** Lit un chemin pointe sur le batiment ("envelope.wallInsulation" ...). */
function readPath(building: Building, path: string): Primitive {
  let current: unknown = building;
  for (const key of path.split('.')) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current as Primitive;
}

/** Convertit le litteral textuel du DSL en valeur typee. */
function parseLiteral(raw: string): string | number | boolean | null {
  const v = raw.trim();
  if (v === 'null') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  const n = Number(v);
  if (v !== '' && !Number.isNaN(n)) return n;
  return v;
}

interface Condition {
  path: string;
  op: '=' | '!=' | '<' | '>';
  value: string | number | boolean | null;
  raw: string;
}

function parseCondition(raw: string): Condition | null {
  // Ordre important : tester '!=' avant '='.
  const match = raw.trim().match(/^([a-zA-Z0-9_.]+)\s*(!=|=|<|>)\s*(.+)$/);
  if (!match) return null;
  return {
    path: match[1],
    op: match[2] as Condition['op'],
    value: parseLiteral(match[3]),
    raw: raw.trim(),
  };
}

function evalCondition(building: Building, cond: Condition): boolean {
  const actual = readPath(building, cond.path);
  const expected = cond.value;

  // Le litteral null matche null ou absent.
  if (expected === null) {
    const isAbsent = actual === null || actual === undefined;
    return cond.op === '!=' ? !isAbsent : cond.op === '=' ? isAbsent : false;
  }

  switch (cond.op) {
    case '=':
      return actual === expected;
    case '!=':
      return actual !== expected;
    case '<':
    case '>': {
      if (typeof actual !== 'number' || typeof expected !== 'number') return false;
      return cond.op === '<' ? actual < expected : actual > expected;
    }
  }
}

/**
 * Evalue la regle `applicableWhen` d'un geste sur un batiment.
 * Chaine vide = toujours applicable.
 */
export function evaluateApplicability(
  building: Building,
  gesture: RenovationGesture,
): ApplicabilityCheck {
  const rule = (gesture.applicableWhen ?? '').trim();
  if (rule === '') return { applicable: true, reason: null };

  for (const rawCond of rule.split(';')) {
    if (rawCond.trim() === '') continue;
    const cond = parseCondition(rawCond);
    if (!cond) {
      return { applicable: false, reason: `Règle inconnue : ${rawCond.trim()}` };
    }
    if (!evalCondition(building, cond)) {
      const actual = readPath(building, cond.path);
      const shown = actual === undefined || actual === null ? 'absent' : String(actual);
      return {
        applicable: false,
        reason: `Condition non remplie : ${cond.raw} (valeur actuelle : ${shown})`,
      };
    }
  }
  return { applicable: true, reason: null };
}

// ---------------------------------------------------------------------------
// Couts
// ---------------------------------------------------------------------------

/** Surface de reference pour le cout au m2, selon le lot du geste. */
export function relevantSurface(building: Building, gesture: RenovationGesture): number {
  // Surface vitree estimee, avec un plancher de 8 m2 pour les petits batiments.
  const glazingArea = Math.max(8, building.livingAreaM2 * building.envelope.glazingRatio);
  switch (gesture.lot) {
    case 'murs':
      return building.livingAreaM2;
    case 'toiture':
      return building.footprintAreaM2;
    case 'plancher':
      return building.footprintAreaM2;
    case 'baies':
      return glazingArea;
    case 'protections_solaires':
      return glazingArea;
    case 'chauffage':
    case 'ecs':
    case 'refroidissement':
    case 'ventilation':
    case 'usage':
      return building.livingAreaM2;
    case 'solaire':
      return building.systems.pvSurfaceM2 > 0
        ? building.systems.pvSurfaceM2
        : building.footprintAreaM2 * 0.5;
  }
}

/** Cout estime : cout fixe + cout au m2 x surface de reference. */
export function estimateCost(building: Building, gesture: RenovationGesture): number {
  return (gesture.fixedCost ?? 0) + (gesture.costPerM2 ?? 0) * relevantSurface(building, gesture);
}

// ---------------------------------------------------------------------------
// Classement des gestes
// ---------------------------------------------------------------------------

/** Impacts combines d'un geste avec ses gestes requis (reductions multiplicatives). */
interface CombinedImpact {
  epSavingPct: number;
  gesSavingPct: number;
  dhReductionPct: number;
  totalCost: number;
}

/** Replie les gestes requis (requiresGestureIds) dans le geste parent. */
export function combineWithRequires(
  building: Building,
  gesture: RenovationGesture,
  allGestures: RenovationGesture[],
): CombinedImpact {
  let epKeep = 1 - gesture.epSavingPct;
  let gesKeep = 1 - gesture.gesSavingPct;
  let dhKeep = 1 - gesture.dhReductionPct;
  let totalCost = estimateCost(building, gesture);

  for (const reqId of gesture.requiresGestureIds) {
    const req = allGestures.find((g) => g.id === reqId);
    if (!req) continue;
    epKeep *= 1 - req.epSavingPct;
    gesKeep *= 1 - req.gesSavingPct;
    dhKeep *= 1 - req.dhReductionPct;
    totalCost += estimateCost(building, req);
  }

  return {
    epSavingPct: Math.min(1 - epKeep, MAX_COMBINED_REDUCTION),
    gesSavingPct: Math.min(1 - gesKeep, MAX_COMBINED_REDUCTION),
    dhReductionPct: Math.min(1 - dhKeep, MAX_COMBINED_REDUCTION),
    totalCost,
  };
}

/** Retour sur investissement en annees ; 99 quand le calcul n'a pas de sens. */
export function paybackYears(cost: number, annualSaving: number): number {
  if (annualSaving <= 0) return 99;
  const years = cost / annualSaving;
  return Number.isFinite(years) ? Math.min(years, 99) : 99;
}

const clampScore = (v: number): number => Math.max(0, Math.min(100, v));

/** Score 0..100 selon l'objectif d'optimisation. */
export function scoreForObjective(
  objective: OptimizationObjective,
  impact: CombinedImpact,
  payback: number,
): number {
  const comfort = impact.dhReductionPct * 100;
  const energy = impact.epSavingPct * 100;
  const carbon = impact.gesSavingPct * 100;
  const cost = 100 - Math.min(payback, 25) * 4;
  switch (objective) {
    case 'comfort':
      return clampScore(comfort);
    case 'energy':
      return clampScore(energy);
    case 'carbon':
      return clampScore(carbon);
    case 'cost':
      return clampScore(cost);
    case 'custom':
      return clampScore((comfort + energy + carbon + cost) / 4);
  }
}

/**
 * Classe tous les gestes du corpus pour un batiment et un objectif.
 * Tri : score decroissant, gestes non applicables en fin de liste.
 */
export function rankGestures(
  building: Building,
  objective: OptimizationObjective,
  options: EngineOptions = {},
): ScenarioResult[] {
  const { gestures, energyPrice, profile } = resolveOptions(options);
  const results: ScenarioResult[] = gestures.map((gesture) => {
    const check = evaluateApplicability(building, gesture);
    const impact = combineWithRequires(building, gesture, gestures);

    const newEp = building.certificate.ep * (1 - impact.epSavingPct);
    const newGes = building.certificate.ges * (1 - impact.gesSavingPct);
    const newDh2050 = building.comfort.dh2050 * (1 - impact.dhReductionPct);
    const newLabel: EnergyLabel = labelFromIndicators(newEp, newGes, profile);

    const savedKwhEp = building.annualConsumptionKwhEp * impact.epSavingPct;
    const annualSaving = savedKwhEp * energyPrice;
    const payback = paybackYears(impact.totalCost, annualSaving);
    const score = scoreForObjective(objective, impact, payback);

    return {
      gesture,
      score,
      newLabel,
      newEp,
      newGes,
      newDh2050,
      estimatedCost: impact.totalCost,
      annualSaving,
      paybackYears: payback,
      applicable: check.applicable,
      inapplicabilityReason: check.reason,
    };
  });

  results.sort((a, b) => {
    if (a.applicable !== b.applicable) return a.applicable ? -1 : 1;
    return b.score - a.score;
  });
  return results;
}
