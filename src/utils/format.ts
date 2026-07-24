/**
 * format.ts — display helpers for the UI.
 * Numbers, units, and translation of the data contract's enum values.
 */

import type { Building, GestureLot } from '../types';
import { COUNTRY } from '../config/country';
import { evaluateApplicability } from '../engine';
import type { RenovationGesture } from '../types';

const nf0 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });

/** "12,400" */
export function formatNumber(n: number): string {
  return nf0.format(Math.round(n));
}

/** "£12,400" */
export function formatCurrency(n: number): string {
  return `${COUNTRY.currencySymbol}${formatNumber(n)}`;
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

/** "218 kWh/m²/year" */
export function formatEp(n: number): string {
  return `${formatNumber(n)} kWh/m²/year`;
}

/** "34 kgCO2/m²/year" */
export function formatGes(n: number): string {
  return `${formatNumber(n)} kgCO2/m²/year`;
}

/** "377,794 kWh/year" */
export function formatAnnualKwh(n: number): string {
  return `${formatNumber(n)} kWh/year`;
}

/** "58.9 tCO2/year" */
export function formatAnnualGes(n: number): string {
  return `${nf1.format(n / 1000)} tCO2/year`;
}

/** "2,160 °C.h" */
export function formatDh(n: number): string {
  return `${formatNumber(n)} °C.h`;
}

/** Payback: 99 means beyond the limit. */
export function formatPayback(years: number): string {
  if (years >= 99) return '> 99 years';
  return `${nf1.format(years)} years`;
}

/** Indicative cost range, e.g. "£800 to £5,000". */
export function formatCostRange(range: [number, number]): string {
  const [min, max] = range;
  if (min === 0 && max === 0) return 'Free';
  if (min === 0) return `0 to ${formatCurrency(max)}`;
  return `${formatCurrency(min)} to ${formatCurrency(max)}`;
}

// ---------------------------------------------------------------------------
// Enum translation
// ---------------------------------------------------------------------------

const USAGE_LABELS: Record<string, string> = {
  residential_collective: 'Block of flats',
  residential_individual: 'House',
  tertiary_office: 'Offices',
  tertiary_school: 'School',
  tertiary_commerce: 'Retail',
};

const WALL_MATERIAL_LABELS: Record<string, string> = {
  beton: 'Concrete',
  parpaing: 'Concrete block',
  brique: 'Brick',
  pierre: 'Stone',
  bois: 'Timber frame',
  'pisé': 'Cob',
};

const WALL_INSULATION_LABELS: Record<string, string> = {
  aucune: 'None (solid wall)',
  cavite_vide: 'Unfilled cavity',
  repartie: 'Filled cavity',
  iti: 'Internal wall insulation',
  ite: 'External wall insulation',
};

const ROOF_TYPE_LABELS: Record<string, string> = {
  terrasse: 'Flat roof',
  inclinee: 'Pitched roof',
};

const GLAZING_LABELS: Record<string, string> = {
  simple: 'Single glazing',
  double: 'Double glazing',
  double_renouvele: 'Upgraded double glazing',
  triple: 'Triple glazing',
};

const INERTIA_LABELS: Record<string, string> = {
  legere: 'Light',
  moyenne: 'Medium',
  lourde: 'Heavy',
};

const ENERGY_LABELS: Record<string, string> = {
  gaz_naturel: 'Mains gas',
  fioul: 'Heating oil',
  electricite: 'Electricity',
  reseau_chaleur: 'District heating',
  bois: 'Wood',
  pac: 'Heat pump',
};

const SYSTEM_KIND_LABELS: Record<string, string> = {
  gas_boiler: 'Gas boiler',
  gas_combi_boiler: 'Gas combi boiler',
  oil_boiler: 'Oil boiler',
  storage_heaters: 'Electric storage heaters',
  panel_heaters: 'Electric panel heaters',
  ashp_air_water: 'Air source heat pump',
  district_heat: 'District heat connection',
  wood_stove: 'Wood-burning stove',
  dhw_gas_boiler: 'Hot water from gas boiler',
  dhw_immersion: 'Immersion heater',
  dhw_heat_pump: 'Heat pump hot water cylinder',
  dhw_oil: 'Hot water from oil boiler',
  dhw_district: 'Hot water from district heating',
};

const COOLING_LABELS: Record<string, string> = {
  pac_air_air: 'Reversible air-to-air heat pump',
  climatisation_centralisee: 'Central air conditioning',
};

const VENTILATION_LABELS: Record<string, string> = {
  naturelle: 'Natural ventilation',
  vmc_simple_flux: 'Mechanical extract ventilation',
  vmc_hygro: 'Demand-controlled ventilation',
  vmc_double_flux: 'Heat recovery ventilation',
};

const LOT_LABELS: Record<GestureLot, string> = {
  murs: 'Walls',
  toiture: 'Roof',
  plancher: 'Ground floor',
  baies: 'Windows and glazing',
  protections_solaires: 'Solar shading',
  chauffage: 'Heating',
  ecs: 'Hot water',
  refroidissement: 'Cooling',
  ventilation: 'Ventilation',
  solaire: 'Solar',
  usage: 'Behaviour and controls',
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
 * Evaluates a heatwave recommendation's `trigger` field with the same DSL
 * as the smart filter for renovation gestures.
 */
export function matchesTrigger(building: Building, trigger: string): boolean {
  const rule = (trigger ?? '').trim();
  if (rule === '') return true;
  const pseudoGesture = { applicableWhen: rule } as RenovationGesture;
  return evaluateApplicability(building, pseudoGesture).applicable;
}
