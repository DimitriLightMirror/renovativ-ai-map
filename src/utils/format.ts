/**
 * format.ts — aides d'affichage francais pour l'interface.
 * Nombres, unites, et traduction des valeurs d'enum du contrat de donnees.
 */

import type { Building, GestureLot } from '../types';
import { evaluateApplicability } from '../engine';
import type { RenovationGesture } from '../types';

const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** "12 400" */
export function formatNumber(n: number): string {
  return nf0.format(Math.round(n));
}

/** "12 400 €" */
export function formatCurrency(n: number): string {
  return `${formatNumber(n)} €`;
}

/** "1 733 m²" */
export function formatArea(n: number): string {
  return `${formatNumber(n)} m²`;
}

/** "9,3 m" */
export function formatMeters(n: number): string {
  return `${nf1.format(n)} m`;
}

/** "0,93 W/m²K" */
export function formatUValue(n: number): string {
  return `${nf2.format(n)} W/m²K`;
}

/** "218 kWhEP/m²/an" */
export function formatEp(n: number): string {
  return `${formatNumber(n)} kWhEP/m²/an`;
}

/** "34 kgCO2/m²/an" */
export function formatGes(n: number): string {
  return `${formatNumber(n)} kgCO2/m²/an`;
}

/** "377 794 kWhEP/an" */
export function formatAnnualKwh(n: number): string {
  return `${formatNumber(n)} kWhEP/an`;
}

/** "58,9 tCO2/an" */
export function formatAnnualGes(n: number): string {
  return `${nf1.format(n / 1000)} tCO2/an`;
}

/** "2 160 °C.h" */
export function formatDh(n: number): string {
  return `${formatNumber(n)} °C.h`;
}

/** Retour sur investissement : 99 signifie hors limite. */
export function formatPayback(years: number): string {
  if (years >= 99) return '> 99 ans';
  return `${nf1.format(years)} ans`;
}

/** Fourchette de couts indicative, ex. "800 € à 5 000 €". */
export function formatCostRange(range: [number, number]): string {
  const [min, max] = range;
  if (min === 0 && max === 0) return 'Gratuit';
  if (min === 0) return `0 à ${formatCurrency(max)}`;
  return `${formatCurrency(min)} à ${formatCurrency(max)}`;
}

// ---------------------------------------------------------------------------
// Traduction des enums
// ---------------------------------------------------------------------------

const USAGE_LABELS: Record<string, string> = {
  residential_collective: 'Logement collectif',
  residential_individual: 'Maison individuelle',
  tertiary_office: 'Bureaux',
  tertiary_school: 'École',
  tertiary_commerce: 'Commerce',
};

const WALL_MATERIAL_LABELS: Record<string, string> = {
  beton: 'Béton',
  parpaing: 'Parpaing',
  brique: 'Brique',
  pierre: 'Pierre',
  bois: 'Bois',
  'pisé': 'Pisé',
};

const WALL_INSULATION_LABELS: Record<string, string> = {
  aucune: 'Aucune',
  iti: 'Par l’intérieur',
  ite: 'Par l’extérieur',
  repartie: 'Répartie',
};

const ROOF_TYPE_LABELS: Record<string, string> = {
  terrasse: 'Toiture terrasse',
  inclinee: 'Toiture inclinée',
};

const GLAZING_LABELS: Record<string, string> = {
  simple: 'Simple vitrage',
  double: 'Double vitrage',
  double_renouvele: 'Double vitrage renouvelé',
  triple: 'Triple vitrage',
};

const INERTIA_LABELS: Record<string, string> = {
  legere: 'Légère',
  moyenne: 'Moyenne',
  lourde: 'Lourde',
};

const ENERGY_LABELS: Record<string, string> = {
  gaz_naturel: 'Gaz naturel',
  fioul: 'Fioul',
  electricite: 'Électricité',
  reseau_chaleur: 'Réseau de chaleur',
  bois: 'Bois',
  pac: 'Pompe à chaleur',
};

const SYSTEM_KIND_LABELS: Record<string, string> = {
  chaudiere_gaz: 'Chaudière gaz',
  chaudiere_gaz_condensation: 'Chaudière gaz à condensation',
  chaudiere_fioul: 'Chaudière fioul',
  chaudiere_bois: 'Chaudière bois',
  pac_air_eau: 'Pompe à chaleur air/eau',
  pac_air_air: 'Pompe à chaleur air/air',
  radiateurs_electriques: 'Radiateurs électriques',
  radiateurs_electriques_appoint: 'Radiateurs électriques d’appoint',
  convecteurs_electriques: 'Convecteurs électriques',
  poele_bois: 'Poêle à bois',
  reseau_chaleur_urbain: 'Réseau de chaleur urbain',
  chauffe_eau_electrique: 'Chauffe-eau électrique',
  chauffe_eau_thermodynamique: 'Chauffe-eau thermodynamique',
  chauffe_bain_gaz: 'Chauffe-bain gaz',
  production_ecs_fioul: 'Production ECS au fioul',
  ecs_reseau_chaleur: 'ECS par réseau de chaleur',
  ballon_bois: 'Ballon bois',
};

const COOLING_LABELS: Record<string, string> = {
  pac_air_air: 'Pompe à chaleur air/air réversible',
  climatisation_centralisee: 'Climatisation centralisée',
};

const VENTILATION_LABELS: Record<string, string> = {
  naturelle: 'Ventilation naturelle',
  vmc_simple_flux: 'VMC simple flux',
  vmc_hygro: 'VMC hygroréglable',
  vmc_double_flux: 'VMC double flux',
};

const LOT_LABELS: Record<GestureLot, string> = {
  murs: 'Murs',
  toiture: 'Toiture',
  plancher: 'Plancher bas',
  baies: 'Baies et vitrages',
  protections_solaires: 'Protections solaires',
  chauffage: 'Chauffage',
  ecs: 'Eau chaude sanitaire',
  refroidissement: 'Rafraîchissement',
  ventilation: 'Ventilation',
  solaire: 'Solaire',
  usage: 'Usages',
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
// DSL partage pour les declencheurs des recommandations canicule
// ---------------------------------------------------------------------------

/**
 * Evalue le champ `trigger` d'une recommandation canicule avec le meme DSL
 * que le filtre intelligent des gestes de renovation.
 */
export function matchesTrigger(building: Building, trigger: string): boolean {
  const rule = (trigger ?? '').trim();
  if (rule === '') return true;
  const pseudoGesture = { applicableWhen: rule } as RenovationGesture;
  return evaluateApplicability(building, pseudoGesture).applicable;
}
