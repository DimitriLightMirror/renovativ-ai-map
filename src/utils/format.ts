/**
 * format.ts — English display helpers for the UI (usa branch).
 * Numbers, units, and translation of the data contract enum values.
 * Currency is USD; the certificate index is a HERS-style score.
 */

import type { Building, GestureLot } from '../types';
import { evaluateApplicability } from '../engine';
import type { RenovationGesture } from '../types';

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** "12,400" */
export function formatNumber(n: number): string {
  return nf0.format(Math.round(n));
}

/** "$12,400" */
export function formatCurrency(n: number): string {
  return `$${formatNumber(n)}`;
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

/** "123" (HERS-style index score, unit appended by the caller) */
export function formatEp(n: number): string {
  return `${formatNumber(n)}`;
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

/** "2,160 °C-h" */
export function formatDh(n: number): string {
  return `${formatNumber(n)} °C-h`;
}

/** Payback period: 99 means out of range. */
export function formatPayback(years: number): string {
  if (years >= 99) return '> 99 years';
  return `${nf1.format(years)} years`;
}

/** Indicative cost range, e.g. "$800 to $5,000". */
export function formatCostRange(range: [number, number]): string {
  const [min, max] = range;
  if (min === 0 && max === 0) return 'Free';
  if (min === 0) return `$0 to ${formatCurrency(max)}`;
  return `${formatCurrency(min)} to ${formatCurrency(max)}`;
}

// ---------------------------------------------------------------------------
// Enum translation
// ---------------------------------------------------------------------------

const USAGE_LABELS: Record<string, string> = {
  residential_collective: 'Multifamily',
  residential_individual: 'Single-family home',
  tertiary_office: 'Office',
  tertiary_school: 'School',
  tertiary_commerce: 'Retail',
};

const WALL_MATERIAL_LABELS: Record<string, string> = {
  beton: 'Concrete',
  parpaing: 'Concrete block (stucco)',
  brique: 'Brick',
  pierre: 'Stone',
  bois: 'Wood frame',
  'pisé': 'Adobe',
};

const WALL_INSULATION_LABELS: Record<string, string> = {
  aucune: 'None',
  iti: 'Cavity insulation',
  ite: 'Continuous exterior insulation',
  repartie: 'Distributed insulation',
};

const ROOF_TYPE_LABELS: Record<string, string> = {
  terrasse: 'Flat roof',
  inclinee: 'Pitched roof',
};

const GLAZING_LABELS: Record<string, string> = {
  simple: 'Single pane',
  double: 'Double pane',
  double_renouvele: 'Low-e double pane',
  triple: 'Triple pane',
};

const INERTIA_LABELS: Record<string, string> = {
  legere: 'Light',
  moyenne: 'Medium',
  lourde: 'Heavy',
};

const ENERGY_LABELS: Record<string, string> = {
  gaz_naturel: 'Natural gas',
  fioul: 'Fuel oil',
  electricite: 'Electricity',
  reseau_chaleur: 'District steam',
  bois: 'Wood',
  pac: 'Heat pump',
};

const SYSTEM_KIND_LABELS: Record<string, string> = {
  gas_furnace: 'Gas furnace',
  gas_furnace_condensing: 'Condensing gas furnace',
  oil_boiler: 'Oil boiler',
  electric_baseboard: 'Electric baseboard',
  electric_furnace: 'Electric furnace',
  heat_pump_ducted: 'Ducted heat pump',
  mini_split: 'Ductless mini-split',
  wood_stove: 'Wood stove',
  district_steam: 'District steam',
  gas_water_heater: 'Gas water heater',
  tankless_gas_water_heater: 'Tankless gas water heater',
  electric_water_heater: 'Electric water heater',
  heat_pump_water_heater: 'Heat pump water heater',
  oil_water_heater: 'Oil water heater',
  district_dhw: 'District hot water',
};

const COOLING_LABELS: Record<string, string> = {
  pac_air_air: 'Heat pump or room AC',
  climatisation_centralisee: 'Central air conditioning',
};

const VENTILATION_LABELS: Record<string, string> = {
  naturelle: 'Natural (operable windows)',
  vmc_simple_flux: 'Exhaust fans (spot ventilation)',
  vmc_hygro: 'Demand-controlled exhaust',
  vmc_double_flux: 'Balanced ERV/HRV',
};

const LOT_LABELS: Record<GestureLot, string> = {
  murs: 'Walls',
  toiture: 'Roof and attic',
  plancher: 'Floor',
  baies: 'Windows',
  protections_solaires: 'Solar shading',
  chauffage: 'Heating',
  ecs: 'Water heating',
  refroidissement: 'Cooling',
  ventilation: 'Ventilation',
  solaire: 'Solar',
  usage: 'Usage',
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
// Shared DSL for heat wave recommendation triggers
// ---------------------------------------------------------------------------

/**
 * Evaluates a heat wave recommendation `trigger` with the same DSL as the
 * renovation gesture smart filter.
 */
export function matchesTrigger(building: Building, trigger: string): boolean {
  const rule = (trigger ?? '').trim();
  if (rule === '') return true;
  const pseudoGesture = { applicableWhen: rule } as RenovationGesture;
  return evaluateApplicability(building, pseudoGesture).applicable;
}
