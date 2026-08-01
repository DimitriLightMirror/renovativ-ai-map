/**
 * Renovativ AI Map — shared data contract.
 * Orchestrator-owned. Workers MUST NOT modify this file.
 * Country-specific branches (uk, usa) may extend via their own config, not by editing this file.
 */

// ---------------------------------------------------------------------------
// Geography / country
// ---------------------------------------------------------------------------

export type CountryCode = 'FR' | 'UK' | 'US';

export interface CountryConfig {
  code: CountryCode;
  language: 'fr' | 'en';
  currency: 'EUR' | 'GBP' | 'USD';
  currencySymbol: string;
  /** Local name of the energy performance certificate: "DPE" (FR), "EPC" (UK), "HERS Index" (US) */
  certificateName: string;
  mapCenter: [number, number];
  mapZoom: number;
  regulationModule: string; // e.g. '../content/regulation-fr'
}

// ---------------------------------------------------------------------------
// Building (BDNB-shaped)
// ---------------------------------------------------------------------------

export type EnergyLabel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export type UsageType =
  | 'residential_collective'
  | 'residential_individual'
  | 'tertiary_office'
  | 'tertiary_school'
  | 'tertiary_commerce';

export type HeatingEnergy =
  | 'gaz_naturel'
  | 'fioul'
  | 'electricite'
  | 'reseau_chaleur'
  | 'bois'
  | 'pac';

export type VentilationType =
  | 'naturelle'
  | 'vmc_simple_flux'
  | 'vmc_double_flux'
  | 'vmc_hygro';

export type InertiaClass = 'legere' | 'moyenne' | 'lourde';

export interface EnergySystem {
  kind: string;           // e.g. 'chaudiere_gaz', 'pac_air_eau', 'radiateurs_electriques'
  energy: HeatingEnergy;
  ageYears: number;
}

export interface Envelope {
  wallMaterial: string;        // 'beton' | 'brique' | 'pierre' | 'bois' ...
  wallInsulation: string;      // 'aucune' | 'iti' | 'ite' | 'repartie'
  uWall: number;               // W/m²K
  roofType: string;            // 'terrasse' | 'inclinee'
  uRoof: number;
  uFloor: number;
  glazingRatio: number;        // 0..1
  glazingType: string;         // 'simple' | 'double' | 'double_renouvele' | 'triple'
  solarProtection: boolean;    // volets / stores extérieurs
  inertia: InertiaClass;
}

export interface BuildingSystems {
  heating: EnergySystem;
  heatingSecondary: EnergySystem | null;
  dhw: EnergySystem;
  cooling: string | null;      // null | 'pac_air_air' | 'climatisation_centralisee'
  ventilation: VentilationType;
  hasCeilingFans: boolean;     // brasseurs d'air
  pvSurfaceM2: number;
}

/** Degrés-heures d'inconfort estival (sans climatisation), per climate horizon */
export interface SummerComfort {
  dh2025: number;
  dh2050: number;
  dh2100: number;
}

export interface CertificateScore {
  label: EnergyLabel;
  /** Primary energy consumption, kWhEP/m²/an */
  ep: number;
  /** Greenhouse gas emissions, kgCO2/m²/an */
  ges: number;
  gesLabel: EnergyLabel;
}

export interface Building {
  id: string;
  /** National database identifiers (BDNB / RNB in France) */
  nationalDbId: string;
  registryId: string;
  address: string;
  city: string;
  postcode: string;
  department: string;
  lat: number;
  lng: number;
  usage: UsageType;
  constructionYear: number;
  footprintAreaM2: number;
  floors: number;
  heightM: number;
  livingAreaM2: number;
  housingUnits: number;
  envelope: Envelope;
  systems: BuildingSystems;
  certificate: CertificateScore;
  comfort: SummerComfort;
  /** Annual figures for the whole building */
  annualConsumptionKwhEp: number;
  annualGesKgCo2: number;
  /**
   * Indicative annual energy cost in the region's local currency
   * (€ / £ / $ / kr.) — the historical `Eur` suffix is kept for the JSON contract.
   */
  annualEnergyCostEur: number;
}

// ---------------------------------------------------------------------------
// Renovation gestures & scenarios
// ---------------------------------------------------------------------------

export type GestureLot =
  | 'murs'
  | 'toiture'
  | 'plancher'
  | 'baies'
  | 'protections_solaires'
  | 'chauffage'
  | 'ecs'
  | 'refroidissement'
  | 'ventilation'
  | 'solaire'
  | 'usage';

export interface RenovationGesture {
  id: string;
  name: string;
  lot: GestureLot;
  mode: 'simple' | 'detail';
  description: string;
  /** Cost model */
  costPerM2?: number;    // applied to relevant surface (wall, roof, living area)
  fixedCost?: number;
  /**
   * When false, heat-pump gestures use fixedCost only (full installed price).
   * Default true: engine applies (fixedCost + kW × price/kW) × archetype.
   */
  capacityPricing?: boolean;
  /** Impact model (fractions, 0..1) */
  epSavingPct: number;       // reduction of primary energy
  gesSavingPct: number;      // reduction of GES
  dhReductionPct: number;    // reduction of summer discomfort degree-hours
  /** Free-text applicability rule, evaluated by the engine's smart filter */
  applicableWhen: string;
  /** IDs of gestures auto-added for coherence (e.g. emitter replacement with a heat pump) */
  requiresGestureIds: string[];
  regulationRefs: string[];  // keys into the regulation corpus
}

export type OptimizationObjective = 'comfort' | 'energy' | 'carbon' | 'cost' | 'custom';

export interface ScenarioResult {
  gesture: RenovationGesture;
  /** 0..100 — impact score for the chosen objective on this building */
  score: number;
  newLabel: EnergyLabel;
  newEp: number;
  newGes: number;
  newDh2050: number;
  estimatedCost: number;     // country currency
  annualSaving: number;      // country currency per year
  paybackYears: number;
  applicable: boolean;
  inapplicabilityReason: string | null;
}

// ---------------------------------------------------------------------------
// Regulation corpus
// ---------------------------------------------------------------------------

export interface RegulationItem {
  key: string;               // e.g. 'dpe_2021', 're2020', 'decret_tertiaire', 'plan_canicule'
  title: string;
  shortName: string;
  summary: string;
  obligations: string[];
  thresholds: { label: string; value: string }[];
  officialUrl: string;
  relevance: ('certificate' | 'renovation' | 'heatwave' | 'funding')[];
}

export interface HeatwaveRecommendation {
  id: string;
  title: string;
  description: string;
  /** Which building trait makes this recommendation relevant */
  trigger: string;
  priority: 'essentiel' | 'recommande' | 'optionnel';
  regulationRefs: string[];
  indicativeCostEUR: [number, number]; // range, country currency on branches
}
