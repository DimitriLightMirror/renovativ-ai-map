/**
 * Fuel-aware retail energy prices in each region's local currency per kWh.
 * Used for renovation savings and for indicative annual bills when register
 * costs are missing. Values are 2025/26 ballparks, not regulated tariffs.
 */

import type { Building } from '../types';
import type { RegionConfig, RegionId } from '../regions';

type FuelKey =
  | 'gaz_naturel'
  | 'fioul'
  | 'electricite'
  | 'reseau_chaleur'
  | 'bois'
  | 'pac'
  | 'default';

const FUEL_PRICES: Record<RegionId, Partial<Record<FuelKey, number>>> = {
  fr: {
    electricite: 0.22,
    gaz_naturel: 0.12,
    fioul: 0.14,
    reseau_chaleur: 0.11,
    bois: 0.08,
    pac: 0.2,
    default: 0.15,
  },
  uk: {
    electricite: 0.26,
    gaz_naturel: 0.07,
    fioul: 0.09,
    reseau_chaleur: 0.1,
    bois: 0.08,
    pac: 0.22,
    default: 0.12,
  },
  us: {
    electricite: 0.3,
    gaz_naturel: 0.05,
    fioul: 0.08,
    reseau_chaleur: 0.12,
    bois: 0.06,
    pac: 0.28,
    default: 0.18,
  },
  nl: {
    electricite: 0.28,
    gaz_naturel: 0.12,
    fioul: 0.14,
    reseau_chaleur: 0.1,
    bois: 0.08,
    pac: 0.25,
    default: 0.18,
  },
  /** DKK/kWh — Copenhagen stock is mostly fjernvarme, not electricity. */
  dk: {
    electricite: 2.5,
    gaz_naturel: 1.2,
    fioul: 1.4,
    reseau_chaleur: 0.95,
    bois: 0.7,
    pac: 2.2,
    default: 1.0,
  },
};

/** Retail price in the region's currency for this building's main heating fuel. */
export function energyPriceForBuilding(building: Building, region: RegionConfig): number {
  const fuel = (building.systems.heating.energy ?? 'default') as FuelKey;
  const table = FUEL_PRICES[region.id];
  return table[fuel] ?? table.default ?? region.energyPrice;
}

/** Indicative annual bill from consumption × fuel tariff (local currency). */
export function estimateAnnualEnergyCost(building: Building, region: RegionConfig): number {
  return Math.round(building.annualConsumptionKwhEp * energyPriceForBuilding(building, region));
}
