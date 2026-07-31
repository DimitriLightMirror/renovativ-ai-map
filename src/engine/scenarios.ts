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
  HeatingEnergy,
  OptimizationObjective,
  RenovationGesture,
  ScenarioResult,
  UsageType,
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
// Surfaces d'enveloppe derivees de la geometrie
// ---------------------------------------------------------------------------

export interface EnvelopeSurfaces {
  wallAreaM2: number;
  roofAreaM2: number;
  floorAreaM2: number;
  glazingAreaM2: number;
}

const clampNum = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

/**
 * Surfaces de reference calculees depuis la geometrie du batiment :
 * murs = perimetre (approximation carree) x hauteur x 0,75 (ouvertures),
 * toiture et plancher = emprise au sol, vitrage = ratio x surface habitable.
 * En collectif, les murs sont reduits de 20 % (mitoyennete).
 */
export function envelopeSurfaces(building: Building): EnvelopeSurfaces {
  const footprint = Math.max(1, building.footprintAreaM2);
  const perimeter = 4 * Math.sqrt(footprint);
  let wallAreaM2 = perimeter * building.heightM * 0.75;
  if (building.usage === 'residential_collective') {
    wallAreaM2 *= 0.8;
  }
  return {
    wallAreaM2,
    roofAreaM2: footprint,
    floorAreaM2: footprint,
    glazingAreaM2: Math.max(8, building.livingAreaM2 * building.envelope.glazingRatio),
  };
}

// ---------------------------------------------------------------------------
// Dimensionnement et cout capacitaire des pompes a chaleur
// ---------------------------------------------------------------------------

/** Heures equivalent pleine charge du chauffage, par region. */
const FULL_LOAD_HOURS: Record<EngineProfile, number> = {
  fr: 2000,
  uk: 2000,
  nl: 2000,
  us: 1800,
  dk: 2200, // climat danois plus froid, saison de chauffe plus longue
};

/** Prix installe par kW de puissance PAC, en devise de la region. */
const HEAT_PUMP_PRICE_PER_KW: Record<EngineProfile, number> = {
  fr: 900,
  uk: 950,
  nl: 1000,
  us: 1000,
  dk: 7000, // DKK par kW (~940 EUR), cout d'installation comparable aux Pays-Bas
};

/** Repere les gestes "pompe a chaleur" du lot chauffage (id ou nom). */
const HEAT_PUMP_PATTERN = /pac|heat[-_\s]?pump|warmtepomp|pompe/i;

/** Vrai si le geste est une pompe a chaleur (lot chauffage uniquement). */
export function isHeatPumpGesture(gesture: RenovationGesture): boolean {
  return (
    gesture.lot === 'chauffage' &&
    (HEAT_PUMP_PATTERN.test(gesture.id) || HEAT_PUMP_PATTERN.test(gesture.name))
  );
}

/** Multiplicateur d'installation selon l'archetype de batiment. */
function archetypeMultiplier(usage: UsageType): number {
  switch (usage) {
    case 'residential_individual':
      return 0.85; // installation mono simple
    case 'residential_collective':
      return 1.15; // hydraulique et chaufferie collective
    default:
      return 1.1; // tertiaire
  }
}

/**
 * Puissance de PAC dimensionnee sur le batiment :
 * consommation annuelle (ep x surface) divisee par les heures pleine charge,
 * bornee a 4..30 kW en residentiel et 4..200 kW en tertiaire.
 */
export function heatPumpCapacityKw(building: Building, profile: EngineProfile = 'fr'): number {
  const hours = FULL_LOAD_HOURS[profile];
  const raw = (building.certificate.ep * building.livingAreaM2) / hours;
  const isTertiary =
    building.usage !== 'residential_individual' &&
    building.usage !== 'residential_collective';
  return clampNum(raw, 4, isTertiary ? 200 : 30);
}

export interface CapacityCostDetail {
  capacityKW: number;
  pricePerKW: number;
  multiplier: number;
  fixedPart: number;
  total: number;
}

/**
 * Cout capacitaire d'une PAC : (partie fixe + kW x prix/kW) x multiplicateur
 * d'archetype. Retourne null si le geste n'est pas une pompe a chaleur.
 */
export function heatPumpCost(
  building: Building,
  gesture: RenovationGesture,
  profile: EngineProfile = 'fr',
): CapacityCostDetail | null {
  if (!isHeatPumpGesture(gesture)) return null;
  const capacityKW = heatPumpCapacityKw(building, profile);
  const pricePerKW = HEAT_PUMP_PRICE_PER_KW[profile];
  const multiplier = archetypeMultiplier(building.usage);
  const fixedPart = gesture.fixedCost ?? 2500;
  const total = Math.round((fixedPart + capacityKW * pricePerKW) * multiplier);
  return { capacityKW, pricePerKW, multiplier, fixedPart, total };
}

// ---------------------------------------------------------------------------
// Couts
// ---------------------------------------------------------------------------

/** Surface de reference pour le cout au m2, selon le lot du geste. */
export function relevantSurface(building: Building, gesture: RenovationGesture): number {
  const surfaces = envelopeSurfaces(building);
  switch (gesture.lot) {
    case 'murs':
      return surfaces.wallAreaM2;
    case 'toiture':
      return surfaces.roofAreaM2;
    case 'plancher':
      return surfaces.floorAreaM2;
    case 'baies':
      return surfaces.glazingAreaM2;
    case 'protections_solaires':
      return surfaces.glazingAreaM2;
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

/**
 * Cout estime : pricing capacitaire pour les pompes a chaleur,
 * sinon cout fixe + cout au m2 x surface de reference.
 */
export function estimateCost(
  building: Building,
  gesture: RenovationGesture,
  profile: EngineProfile = 'fr',
): number {
  const capacity = heatPumpCost(building, gesture, profile);
  if (capacity) return capacity.total;
  return (gesture.fixedCost ?? 0) + (gesture.costPerM2 ?? 0) * relevantSurface(building, gesture);
}

// ---------------------------------------------------------------------------
// Impacts ajustes au batiment
// ---------------------------------------------------------------------------

export interface GestureImpacts {
  epSavingPct: number;
  gesSavingPct: number;
  dhReductionPct: number;
}

/** U de reference par lot d'enveloppe ; null hors enveloppe. */
function refUForLot(gesture: RenovationGesture): number | null {
  switch (gesture.lot) {
    case 'murs':
    case 'toiture':
      return 1.0;
    case 'plancher':
      return 1.2;
    default:
      return null;
  }
}

/** U actuel du batiment pour le lot d'enveloppe du geste. */
function currentUForLot(building: Building, gesture: RenovationGesture): number {
  switch (gesture.lot) {
    case 'murs':
      return building.envelope.uWall;
    case 'toiture':
      return building.envelope.uRoof;
    default:
      return building.envelope.uFloor;
  }
}

/** Facteur d'impact des baies selon le vitrage actuel. */
const GLAZING_EP_FACTOR: Record<string, number> = {
  simple: 1.3,
  double: 1.0,
  double_renouvele: 0.8,
  triple: 0.6,
};

/**
 * Facteur carbone du combustible actuel : remplacer un fioul sale compte
 * davantage que remplacer du bois. L'electricite est sobre en carbone en
 * France (reseau bas carbone) mais pas en uk/us/nl.
 */
function fuelCarbonFactor(energy: HeatingEnergy, profile: EngineProfile): number {
  switch (energy) {
    case 'fioul':
      return 1.2;
    case 'gaz_naturel':
      return 1.0;
    case 'reseau_chaleur':
      return 0.8;
    case 'bois':
      return 0.5;
    case 'electricite':
      return profile === 'fr' ? 0.4 : 1.0;
    case 'pac':
      return 0.1;
    default:
      return 1.0;
  }
}

/**
 * Geste de substitution de generateur : son applicabilite depend de
 * l'energie de chauffage actuelle (contrairement aux gestes d'accompagnement
 * comme les emetteurs basse temperature).
 */
function isFuelSwapGesture(gesture: RenovationGesture): boolean {
  return (
    gesture.lot === 'chauffage' && gesture.applicableWhen.includes('systems.heating.energy')
  );
}

/**
 * Impacts du geste ajustes aux caracteristiques du batiment :
 * - enveloppe : epSaving x clamp(U actuel / U de reference, 0.4, 1.6) ;
 * - baies : epSaving x facteur du vitrage actuel ;
 * - substitution de chauffage : gesSaving x facteur carbone du combustible
 *   actuel, epSaving x clamp(ep / 250, 0.5, 1.8).
 */
export function scaledImpacts(
  building: Building,
  gesture: RenovationGesture,
  profile: EngineProfile = 'fr',
): GestureImpacts {
  let { epSavingPct, gesSavingPct } = gesture;
  const { dhReductionPct } = gesture;

  const refU = refUForLot(gesture);
  if (refU !== null) {
    epSavingPct *= clampNum(currentUForLot(building, gesture) / refU, 0.4, 1.6);
  }

  if (gesture.lot === 'baies') {
    epSavingPct *= GLAZING_EP_FACTOR[building.envelope.glazingType] ?? 1.0;
  }

  if (isFuelSwapGesture(gesture)) {
    gesSavingPct *= fuelCarbonFactor(building.systems.heating.energy, profile);
    epSavingPct *= clampNum(building.certificate.ep / 250, 0.5, 1.8);
  }

  return {
    epSavingPct: clampNum(epSavingPct, 0, 0.95),
    gesSavingPct: clampNum(gesSavingPct, 0, 0.95),
    dhReductionPct,
  };
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
  profile: EngineProfile = 'fr',
): CombinedImpact {
  const own = scaledImpacts(building, gesture, profile);
  let epKeep = 1 - own.epSavingPct;
  let gesKeep = 1 - own.gesSavingPct;
  let dhKeep = 1 - own.dhReductionPct;
  let totalCost = estimateCost(building, gesture, profile);

  for (const reqId of gesture.requiresGestureIds) {
    const req = allGestures.find((g) => g.id === reqId);
    if (!req) continue;
    const reqImpact = scaledImpacts(building, req, profile);
    epKeep *= 1 - reqImpact.epSavingPct;
    gesKeep *= 1 - reqImpact.gesSavingPct;
    dhKeep *= 1 - reqImpact.dhReductionPct;
    totalCost += estimateCost(building, req, profile);
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
    const impact = combineWithRequires(building, gesture, gestures, profile);

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
