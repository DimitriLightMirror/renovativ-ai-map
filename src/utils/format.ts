/**
 * format.ts — display helpers for the English UI (branch `netherlands`).
 * Numbers, units, and translation of the data contract enum values.
 * Dutch domain terms are kept where they are the common name (warmtepomp,
 * stadsverwarming, WTW, spouwmuur...).
 */

import type { Building, GestureLot } from '../types';
import { evaluateApplicability } from '../engine';
import type { RenovationGesture } from '../types';

const nf0 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });

/** "12,400" */
export function formatNumber(n: number): string {
  return nf0.format(Math.round(n));
}

/** "€12,400" */
export function formatCurrency(n: number): string {
  return `€${formatNumber(n)}`;
}

/** "1,733 m²" */
export function formatArea(n: number): string {
  return `${formatNumber(n)} m²`;
}

/** "9.3 m" */
export function formatMeters(n: number): string {
  return `${nf1.format(n)} m`;
}

/** "0.93 W/m²K" */
export function formatUValue(n: number): string {
  return `${nf2.format(n)} W/m²K`;
}

/** "218 kWh/m²/yr" */
export function formatEp(n: number): string {
  return `${formatNumber(n)} kWh/m²/yr`;
}

/** "34 kgCO2/m²/yr" */
export function formatGes(n: number): string {
  return `${formatNumber(n)} kgCO2/m²/yr`;
}

/** "377,794 kWh/yr" */
export function formatAnnualKwh(n: number): string {
  return `${formatNumber(n)} kWh/yr`;
}

/** "58.9 tCO2/yr" */
export function formatAnnualGes(n: number): string {
  return `${nf1.format(n / 1000)} tCO2/yr`;
}

/** "2,160 °C.h" */
export function formatDh(n: number): string {
  return `${formatNumber(n)} °C.h`;
}

/** Payback period; 99 means out of range. */
export function formatPayback(years: number): string {
  if (years >= 99) return '> 99 yrs';
  return `${nf1.format(years)} yrs`;
}

/** Indicative cost range, e.g. "€800 to €5,000". */
export function formatCostRange(range: [number, number]): string {
  const [min, max] = range;
  if (min === 0 && max === 0) return 'Free';
  if (min === 0) return `0 to ${formatCurrency(max)}`;
  return `${formatCurrency(min)} to ${formatCurrency(max)}`;
}

// ---------------------------------------------------------------------------
// Enum translations (English UI, Dutch domain terms kept)
// ---------------------------------------------------------------------------

const USAGE_LABELS: Record<string, string> = {
  residential_collective: 'Apartment building (flat)',
  residential_individual: 'Single-family house (woning)',
  tertiary_office: 'Offices',
  tertiary_school: 'School',
  tertiary_commerce: 'Retail',
};

const WALL_MATERIAL_LABELS: Record<string, string> = {
  beton: 'Concrete',
  parpaing: 'Concrete block',
  brique: 'Brick',
  pierre: 'Natural stone',
  bois: 'Timber',
  'pisé': 'Rammed earth',
};

const WALL_INSULATION_LABELS: Record<string, string> = {
  aucune: 'none',
  iti: 'inside',
  ite: 'outside',
  repartie: 'cavity',
};

const ROOF_TYPE_LABELS: Record<string, string> = {
  terrasse: 'Flat roof (plat dak)',
  inclinee: 'Pitched roof (hellend dak)',
};

const GLAZING_LABELS: Record<string, string> = {
  simple: 'Single glazing',
  double: 'Double glazing',
  double_renouvele: 'HR++ glazing',
  triple: 'Triple glazing',
};

const INERTIA_LABELS: Record<string, string> = {
  legere: 'Light',
  moyenne: 'Medium',
  lourde: 'Heavy',
};

const ENERGY_LABELS: Record<string, string> = {
  gaz_naturel: 'Natural gas',
  fioul: 'Heating oil',
  electricite: 'Electricity',
  reseau_chaleur: 'District heating',
  bois: 'Wood / biomass',
  pac: 'Heat pump (warmtepomp)',
};

const SYSTEM_KIND_LABELS: Record<string, string> = {
  // Dutch stock kinds (modelled, see scripts/fetch-netherlands.mjs)
  cv_ketel: 'Gas boiler (CV-ketel)',
  cv_ketel_hr: 'HR condensing gas boiler (HR-ketel)',
  cv_ketel_combi: 'Combi boiler (CV-ketel)',
  stadsverwarming: 'District heating (stadsverwarming)',
  warmtepomp_lucht_water: 'Air-to-water heat pump (warmtepomp)',
  warmtepompboiler: 'Heat pump boiler (warmtepompboiler)',
  hybride_warmtepomp: 'Hybrid heat pump (hybride warmtepomp)',
  gaskachel: 'Gas heater (gaskachel)',
  // Legacy kinds kept for contract compatibility
  chaudiere_gaz: 'Gas boiler',
  chaudiere_gaz_condensation: 'Condensing gas boiler',
  chaudiere_fioul: 'Oil boiler',
  chaudiere_bois: 'Wood boiler',
  pac_air_eau: 'Air-to-water heat pump',
  pac_air_air: 'Air-to-air heat pump',
  radiateurs_electriques: 'Electric radiators',
  radiateurs_electriques_appoint: 'Backup electric radiators',
  convecteurs_electriques: 'Electric convectors',
  poele_bois: 'Wood stove',
  reseau_chaleur_urbain: 'District heating',
  chauffe_eau_electrique: 'Electric water heater',
  chauffe_eau_thermodynamique: 'Heat pump water heater',
  chauffe_bain_gaz: 'Gas water heater',
  production_ecs_fioul: 'Oil-fired hot water',
  ecs_reseau_chaleur: 'District heating hot water',
  ballon_bois: 'Wood-fired cylinder',
};

const COOLING_LABELS: Record<string, string> = {
  pac_air_air: 'Air-to-air heat pump (airco)',
  climatisation_centralisee: 'Central air conditioning',
};

const VENTILATION_LABELS: Record<string, string> = {
  naturelle: 'Natural ventilation',
  vmc_simple_flux: 'Mechanical extract (MV)',
  vmc_hygro: 'Demand-controlled extract',
  vmc_double_flux: 'Balanced ventilation with heat recovery (WTW)',
};

const LOT_LABELS: Record<GestureLot, string> = {
  murs: 'Walls',
  toiture: 'Roof',
  plancher: 'Floor',
  baies: 'Windows & glazing',
  protections_solaires: 'Shading (zonwering)',
  chauffage: 'Heating',
  ecs: 'Hot water',
  refroidissement: 'Cooling',
  ventilation: 'Ventilation',
  solaire: 'Solar',
  usage: 'Behaviour & controls',
};

function lookup(table: Record<string, string>, key: string): string {
  return table[key] ?? key;
}

export const usageLabel = (v: string): string => lookup(USAGE_LABELS, v);
export const wallMaterialLabel = (v: string): string => lookup(WALL_MATERIAL_LABELS, v);
export const wallInsulationLabel = (v: string): string => lookup(WALL_INSULATION_LABELS, v);
export const roofTypeLabel = (v: string): string => lookup(ROOF_TYPE_LABELS, v);
export const glazingLabel = (v: string): string => lookup(GLAZING_LABELS, v);
export const inertiaLabel = (v: string): string => lookup(INERTIA_LABELS, v);
export const energyLabel = (v: string): string => lookup(ENERGY_LABELS, v);
export const systemKindLabel = (v: string): string => lookup(SYSTEM_KIND_LABELS, v);
export const coolingLabel = (v: string): string => lookup(COOLING_LABELS, v);
export const ventilationLabel = (v: string): string => lookup(VENTILATION_LABELS, v);
export const lotLabel = (v: GestureLot): string => LOT_LABELS[v];

// ---------------------------------------------------------------------------
// Shared DSL for heatwave recommendation triggers
// ---------------------------------------------------------------------------

/**
 * Evaluates a heatwave recommendation `trigger` with the same DSL as the
 * renovation gesture smart filter.
 */
export function matchesTrigger(building: Building, trigger: string): boolean {
  const rule = (trigger ?? '').trim();
  if (rule === '') return true;
  const pseudoGesture = { applicableWhen: rule } as RenovationGesture;
  return evaluateApplicability(building, pseudoGesture).applicable;
}
