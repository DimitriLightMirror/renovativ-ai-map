/**
 * format.ts — aides d'affichage pour l'interface.
 * Nombres, devises, unites et traduction des valeurs d'enum du contrat de
 * donnees, par locale de region : fr-FR (EUR), en-GB (GBP), en-US (USD).
 *
 * La locale active est fixee par App quand la region change, via
 * setFormatConfig. Toutes les fonctions lisent la configuration courante ;
 * les defauts preservent le comportement francais initial.
 */

import type { Building, GestureLot } from '../types';
import { evaluateApplicability } from '../engine';
import type { RenovationGesture } from '../types';

export type FormatLang = 'fr' | 'en';

interface FormatConfig {
  locale: string;
  currencySymbol: string;
  lang: FormatLang;
}

let config: FormatConfig = { locale: 'fr-FR', currencySymbol: '€', lang: 'fr' };

let nf0 = new Intl.NumberFormat(config.locale, { maximumFractionDigits: 0 });
let nf1 = new Intl.NumberFormat(config.locale, { maximumFractionDigits: 1 });
let nf2 = new Intl.NumberFormat(config.locale, { maximumFractionDigits: 2 });

/** Active la locale et la devise d'une region (appele au changement de region). */
export function setFormatConfig(locale: string, currencySymbol: string, lang: FormatLang): void {
  config = { locale, currencySymbol, lang };
  nf0 = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  nf1 = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  nf2 = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
}

/** fr "12 400" / en "12,400" */
export function formatNumber(n: number): string {
  return nf0.format(Math.round(n));
}

/** fr "12 400 €" / en-GB "£12,400" / en-US "$12,400" */
export function formatCurrency(n: number): string {
  const num = formatNumber(n);
  return config.lang === 'fr' ? `${num} ${config.currencySymbol}` : `${config.currencySymbol}${num}`;
}

/** "1 733 m²" */
export function formatArea(n: number): string {
  return `${formatNumber(n)} m²`;
}

/** fr "9,3 m" / en "9.3 m" */
export function formatMeters(n: number): string {
  return `${nf1.format(n)} m`;
}

/** "0,93 W/m²K" */
export function formatUValue(n: number): string {
  return `${nf2.format(n)} W/m²K`;
}

/** fr "218 kWhEP/m²/an" / en "218 kWh/m²/yr" */
export function formatEp(n: number): string {
  return `${formatNumber(n)} ${config.lang === 'fr' ? 'kWhEP/m²/an' : 'kWh/m²/yr'}`;
}

/** fr "34 kgCO2/m²/an" / en "34 kgCO2/m²/yr" */
export function formatGes(n: number): string {
  return `${formatNumber(n)} ${config.lang === 'fr' ? 'kgCO2/m²/an' : 'kgCO2/m²/yr'}`;
}

/** fr "377 794 kWhEP/an" / en "377,794 kWh/yr" */
export function formatAnnualKwh(n: number): string {
  return `${formatNumber(n)} ${config.lang === 'fr' ? 'kWhEP/an' : 'kWh/yr'}`;
}

/** fr "58,9 tCO2/an" / en "58.9 tCO2/yr" */
export function formatAnnualGes(n: number): string {
  return `${nf1.format(n / 1000)} ${config.lang === 'fr' ? 'tCO2/an' : 'tCO2/yr'}`;
}

/** "2 160 °C.h" */
export function formatDh(n: number): string {
  return `${formatNumber(n)} °C.h`;
}

/** Retour sur investissement : 99 signifie hors limite. */
export function formatPayback(years: number): string {
  if (config.lang === 'fr') {
    if (years >= 99) return '> 99 ans';
    return `${nf1.format(years)} ans`;
  }
  if (years >= 99) return '> 99 years';
  return `${nf1.format(years)} years`;
}

/** Age d'un systeme : "1 an" / "12 ans" / "1 year" / "12 years". */
export function formatAge(years: number): string {
  if (config.lang === 'fr') return `${years} an${years > 1 ? 's' : ''}`;
  return `${years} year${years > 1 ? 's' : ''}`;
}

/** Fourchette de couts indicative, ex. "800 € à 5 000 €" / "£800 to £5,000". */
export function formatCostRange(range: [number, number]): string {
  const [min, max] = range;
  const free = config.lang === 'fr' ? 'Gratuit' : 'Free';
  const to = config.lang === 'fr' ? 'à' : 'to';
  if (min === 0 && max === 0) return free;
  if (min === 0) return `0 ${to} ${formatCurrency(max)}`;
  return `${formatCurrency(min)} ${to} ${formatCurrency(max)}`;
}

// ---------------------------------------------------------------------------
// Traduction des enums
// ---------------------------------------------------------------------------

const USAGE_LABELS_FR: Record<string, string> = {
  residential_collective: 'Logement collectif',
  residential_individual: 'Maison individuelle',
  tertiary_office: 'Bureaux',
  tertiary_school: 'École',
  tertiary_commerce: 'Commerce',
};

const USAGE_LABELS_EN: Record<string, string> = {
  residential_collective: 'Multi-family housing',
  residential_individual: 'Single-family house',
  tertiary_office: 'Offices',
  tertiary_school: 'School',
  tertiary_commerce: 'Retail',
};

const WALL_MATERIAL_LABELS_FR: Record<string, string> = {
  beton: 'Béton',
  parpaing: 'Parpaing',
  brique: 'Brique',
  pierre: 'Pierre',
  bois: 'Bois',
  'pisé': 'Pisé',
};

const WALL_MATERIAL_LABELS_EN: Record<string, string> = {
  beton: 'Concrete',
  parpaing: 'Concrete block',
  brique: 'Brick',
  pierre: 'Stone',
  bois: 'Timber',
  'pisé': 'Rammed earth',
};

const WALL_INSULATION_LABELS_FR: Record<string, string> = {
  aucune: 'Aucune',
  iti: 'Par l’intérieur',
  ite: 'Par l’extérieur',
  repartie: 'Répartie',
};

const WALL_INSULATION_LABELS_EN: Record<string, string> = {
  aucune: 'None',
  iti: 'Internal',
  ite: 'External',
  repartie: 'Distributed',
};

const ROOF_TYPE_LABELS_FR: Record<string, string> = {
  terrasse: 'Toiture terrasse',
  inclinee: 'Toiture inclinée',
};

const ROOF_TYPE_LABELS_EN: Record<string, string> = {
  terrasse: 'Flat roof',
  inclinee: 'Pitched roof',
};

const GLAZING_LABELS_FR: Record<string, string> = {
  simple: 'Simple vitrage',
  double: 'Double vitrage',
  double_renouvele: 'Double vitrage renouvelé',
  triple: 'Triple vitrage',
};

const GLAZING_LABELS_EN: Record<string, string> = {
  simple: 'Single glazing',
  double: 'Double glazing',
  double_renouvele: 'Upgraded double glazing',
  triple: 'Triple glazing',
};

const INERTIA_LABELS_FR: Record<string, string> = {
  legere: 'Légère',
  moyenne: 'Moyenne',
  lourde: 'Lourde',
};

const INERTIA_LABELS_EN: Record<string, string> = {
  legere: 'Light',
  moyenne: 'Medium',
  lourde: 'Heavy',
};

const ENERGY_LABELS_FR: Record<string, string> = {
  gaz_naturel: 'Gaz naturel',
  fioul: 'Fioul',
  electricite: 'Électricité',
  reseau_chaleur: 'Réseau de chaleur',
  bois: 'Bois',
  pac: 'Pompe à chaleur',
};

const ENERGY_LABELS_EN: Record<string, string> = {
  gaz_naturel: 'Natural gas',
  fioul: 'Heating oil',
  electricite: 'Electricity',
  reseau_chaleur: 'District heating',
  bois: 'Wood',
  pac: 'Heat pump',
};

const SYSTEM_KIND_LABELS_FR: Record<string, string> = {
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

const SYSTEM_KIND_LABELS_EN: Record<string, string> = {
  chaudiere_gaz: 'Gas boiler',
  chaudiere_gaz_condensation: 'Condensing gas boiler',
  chaudiere_fioul: 'Oil boiler',
  chaudiere_bois: 'Wood boiler',
  chaudiere: 'Boiler',
  pac_air_eau: 'Air-to-water heat pump',
  pac_air_air: 'Air-to-air heat pump',
  radiateurs_electriques: 'Electric radiators',
  radiateurs_electriques_appoint: 'Backup electric radiators',
  convecteurs_electriques: 'Electric convectors',
  poele_bois: 'Wood stove',
  reseau_chaleur_urbain: 'District heating network',
  district_steam_coned: 'District steam (Con Edison)',
  chauffe_eau_electrique: 'Electric water heater',
  chauffe_eau_thermodynamique: 'Heat pump water heater',
  chauffe_bain_gaz: 'Gas water heater',
  production_ecs_fioul: 'Oil-fired hot water',
  ecs_reseau_chaleur: 'District hot water',
  ballon_bois: 'Wood-fired tank',
};

const COOLING_LABELS_FR: Record<string, string> = {
  pac_air_air: 'Pompe à chaleur air/air réversible',
  climatisation_centralisee: 'Climatisation centralisée',
};

const COOLING_LABELS_EN: Record<string, string> = {
  pac_air_air: 'Reversible air-to-air heat pump',
  climatisation_centralisee: 'Central air conditioning',
};

const VENTILATION_LABELS_FR: Record<string, string> = {
  naturelle: 'Ventilation naturelle',
  vmc_simple_flux: 'VMC simple flux',
  vmc_hygro: 'VMC hygroréglable',
  vmc_double_flux: 'VMC double flux',
};

const VENTILATION_LABELS_EN: Record<string, string> = {
  naturelle: 'Natural ventilation',
  vmc_simple_flux: 'Single-flow mechanical ventilation',
  vmc_hygro: 'Humidity-controlled ventilation',
  vmc_double_flux: 'Heat recovery ventilation',
};

const LOT_LABELS_FR: Record<GestureLot, string> = {
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

const LOT_LABELS_EN: Record<GestureLot, string> = {
  murs: 'Walls',
  toiture: 'Roof',
  plancher: 'Ground floor',
  baies: 'Windows and glazing',
  protections_solaires: 'Solar shading',
  chauffage: 'Heating',
  ecs: 'Domestic hot water',
  refroidissement: 'Cooling',
  ventilation: 'Ventilation',
  solaire: 'Solar',
  usage: 'Usage',
};

function lookup(frTable: Record<string, string>, enTable: Record<string, string>, key: string): string {
  const table = config.lang === 'fr' ? frTable : enTable;
  return table[key] ?? key;
}

export const usageLabel = (v: string): string => lookup(USAGE_LABELS_FR, USAGE_LABELS_EN, v);
export const wallMaterialLabel = (v: string): string =>
  lookup(WALL_MATERIAL_LABELS_FR, WALL_MATERIAL_LABELS_EN, v);
export const wallInsulationLabel = (v: string): string =>
  lookup(WALL_INSULATION_LABELS_FR, WALL_INSULATION_LABELS_EN, v);
export const roofTypeLabel = (v: string): string =>
  lookup(ROOF_TYPE_LABELS_FR, ROOF_TYPE_LABELS_EN, v);
export const glazingLabel = (v: string): string => lookup(GLAZING_LABELS_FR, GLAZING_LABELS_EN, v);
export const inertiaLabel = (v: string): string => lookup(INERTIA_LABELS_FR, INERTIA_LABELS_EN, v);
export const energyLabel = (v: string): string => lookup(ENERGY_LABELS_FR, ENERGY_LABELS_EN, v);
export const systemKindLabel = (v: string): string =>
  lookup(SYSTEM_KIND_LABELS_FR, SYSTEM_KIND_LABELS_EN, v);
export const coolingLabel = (v: string): string => lookup(COOLING_LABELS_FR, COOLING_LABELS_EN, v);
export const ventilationLabel = (v: string): string =>
  lookup(VENTILATION_LABELS_FR, VENTILATION_LABELS_EN, v);
export const lotLabel = (v: GestureLot): string =>
  (config.lang === 'fr' ? LOT_LABELS_FR : LOT_LABELS_EN)[v];

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
