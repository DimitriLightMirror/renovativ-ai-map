/**
 * scenarios.ts — the ranked gesture chart.
 * Smart applicability filter (shared DSL), cost estimation,
 * ranking of renovation gestures against the chosen objective.
 *
 * Applicability DSL: ';'-separated conditions on building paths
 * (e.g. "envelope.wallInsulation=aucune;constructionYear<1975").
 * Operators: =, !=, <, >. The `null` literal matches null/absent.
 * Empty string = always applicable.
 */

import type {
  Building,
  EnergyLabel,
  OptimizationObjective,
  RenovationGesture,
  ScenarioResult,
} from '../types';
import { GESTURES_UK } from '../content/gestures-uk';
import { finalLabel, labelFromEp, labelFromGes } from './dpe';

/** Blended energy price used to value savings, GBP/kWh. */
export const ENERGY_PRICE_GBP_PER_KWH = 0.15;

/** Combined reduction cap (90 %) to avoid unrealistic values. */
export const MAX_COMBINED_REDUCTION = 0.9;

// ---------------------------------------------------------------------------
// Smart filter: DSL evaluation
// ---------------------------------------------------------------------------

export interface ApplicabilityCheck {
  applicable: boolean;
  /** Readable reason when the gesture does not apply, null otherwise. */
  reason: string | null;
}

type Primitive = string | number | boolean | null | undefined;

/** Reads a dotted path on the building ("envelope.wallInsulation" ...). */
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

/** Converts the DSL text literal into a typed value. */
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
  // Order matters: test '!=' before '='.
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

  // The null literal matches null or absent.
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
 * Evaluates a gesture's `applicableWhen` rule on a building.
 * Empty string = always applicable.
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
      return { applicable: false, reason: `Unknown rule: ${rawCond.trim()}` };
    }
    if (!evalCondition(building, cond)) {
      const actual = readPath(building, cond.path);
      const shown = actual === undefined || actual === null ? 'absent' : String(actual);
      return {
        applicable: false,
        reason: `Condition not met: ${cond.raw} (current value: ${shown})`,
      };
    }
  }
  return { applicable: true, reason: null };
}

// ---------------------------------------------------------------------------
// Costs
// ---------------------------------------------------------------------------

/** Reference surface for per-m2 costs, depending on the gesture lot. */
export function relevantSurface(building: Building, gesture: RenovationGesture): number {
  // Estimated glazed area, with an 8 m2 floor for small buildings.
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

/** Estimated cost: fixed cost + per-m2 cost x reference surface. */
export function estimateCost(building: Building, gesture: RenovationGesture): number {
  return (gesture.fixedCost ?? 0) + (gesture.costPerM2 ?? 0) * relevantSurface(building, gesture);
}

// ---------------------------------------------------------------------------
// Gesture ranking
// ---------------------------------------------------------------------------

/** Combined impacts of a gesture with its required gestures (multiplicative reductions). */
interface CombinedImpact {
  epSavingPct: number;
  gesSavingPct: number;
  dhReductionPct: number;
  totalCost: number;
}

/** Folds required gestures (requiresGestureIds) into the parent gesture. */
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

/** Payback in years; 99 when the computation is meaningless. */
export function paybackYears(cost: number, annualSaving: number): number {
  if (annualSaving <= 0) return 99;
  const years = cost / annualSaving;
  return Number.isFinite(years) ? Math.min(years, 99) : 99;
}

const clampScore = (v: number): number => Math.max(0, Math.min(100, v));

/** Score 0..100 against the optimization objective. */
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
 * Ranks every gesture in the corpus for a building and an objective.
 * Sort: descending score, inapplicable gestures pushed to the end.
 */
export function rankGestures(
  building: Building,
  objective: OptimizationObjective,
): ScenarioResult[] {
  const results: ScenarioResult[] = GESTURES_UK.map((gesture) => {
    const check = evaluateApplicability(building, gesture);
    const impact = combineWithRequires(building, gesture, GESTURES_UK);

    const newEp = building.certificate.ep * (1 - impact.epSavingPct);
    const newGes = building.certificate.ges * (1 - impact.gesSavingPct);
    const newDh2050 = building.comfort.dh2050 * (1 - impact.dhReductionPct);
    const newLabel: EnergyLabel = finalLabel(labelFromEp(newEp), labelFromGes(newGes));

    const savedKwhEp = building.annualConsumptionKwhEp * impact.epSavingPct;
    const annualSaving = savedKwhEp * ENERGY_PRICE_GBP_PER_KWH;
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
