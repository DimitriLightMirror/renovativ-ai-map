/**
 * regions/index.ts — registre des regions couvertes par la carte.
 * Chaque region associe son jeu de donnees reel, son certificat national,
 * sa langue, sa devise, son profil de calcul et ses contenus (reglementation,
 * gestes de renovation, recommandations canicule).
 */

import type {
  HeatwaveRecommendation,
  RegulationItem,
  RenovationGesture,
} from '../types';
import { REGULATION_FR } from '../content/regulation-fr';
import { GESTURES_FR } from '../content/gestures-fr';
import { HEATWAVE_RECS_FR } from '../content/heatwave-fr';
import { REGULATION_UK } from '../content/regulation-uk';
import { GESTURES_UK } from '../content/gestures-uk';
import { HEATWAVE_RECS_UK } from '../content/heatwave-uk';
import { REGULATION_US } from '../content/regulation-us';
import { GESTURES_US } from '../content/gestures-us';
import { HEATWAVE_RECS_US } from '../content/heatwave-us';
import { REGULATION_NL } from '../content/regulation-nl';
import { GESTURES_NL } from '../content/gestures-nl';
import { HEATWAVE_RECS_NL } from '../content/heatwave-nl';
import { REGULATION_DK } from '../content/regulation-dk';
import { GESTURES_DK } from '../content/gestures-dk';
import { HEATWAVE_RECS_DK } from '../content/heatwave-dk';

export type RegionId = 'fr' | 'uk' | 'us' | 'nl' | 'dk';
export type RegionLanguage = 'fr' | 'en';

export interface RegionContent {
  regulation: RegulationItem[];
  gestures: RenovationGesture[];
  heatwave: HeatwaveRecommendation[];
}

export interface LocalizedName {
  fr: string;
  en: string;
}

export interface RegionConfig {
  id: RegionId;
  /** Full titles by UI language, e.g. "France · Alpes-Maritimes (06)". */
  name: LocalizedName;
  /** Short selector labels by UI language. */
  shortName: LocalizedName;
  language: RegionLanguage;
  /** Locale Intl pour les nombres et la devise. */
  locale: string;
  mapCenter: [number, number];
  mapZoom: number;
  /** Nom complet du certificat national. */
  certificateName: string;
  /** Libelle court pour les boutons et onglets. */
  certificateShortName: string;
  currencySymbol: string;
  /**
   * Default retail energy price in local currency / kWh (fallback).
   * Renovation savings use fuel-aware prices from engine/energyPrice.ts.
   */
  energyPrice: number;
  /** Profil de bandes de l'engine pour les etiquettes simulees. */
  engineProfile: RegionId;
  /** Chemin public du JSON de batiments (servi par Vite / GitHub Pages). */
  dataUrl: string;
  /** Nom de la source affiche dans l'onglet caracteristiques. */
  sourceName: string;
  /** Note d'honnetete sur les champs modelises, dans la langue de la region. */
  disclaimer: string;
  content: RegionContent;
}

const base = import.meta.env.BASE_URL;

export const REGIONS: RegionConfig[] = [
  {
    id: 'fr',
    name: {
      fr: 'France · Alpes-Maritimes (06)',
      en: 'France · Alpes-Maritimes (06)',
    },
    shortName: { fr: 'France', en: 'France' },
    language: 'fr',
    locale: 'fr-FR',
    mapCenter: [43.85, 7.05],
    mapZoom: 9,
    certificateName: 'DPE',
    certificateShortName: 'DPE',
    currencySymbol: '€',
    energyPrice: 0.15,
    engineProfile: 'fr',
    dataUrl: `${base}data/fr.json`,
    sourceName: 'BDNB',
    disclaimer:
      'Données réelles issues de la BDNB (Licence Ouverte 2.0). Le confort d’été est modélisé par projection climatique.',
    content: {
      regulation: REGULATION_FR,
      gestures: GESTURES_FR,
      heatwave: HEATWAVE_RECS_FR,
    },
  },
  {
    id: 'uk',
    name: {
      fr: 'Royaume-Uni · Londres',
      en: 'United Kingdom · London',
    },
    shortName: { fr: 'Royaume-Uni', en: 'United Kingdom' },
    language: 'en',
    locale: 'en-GB',
    mapCenter: [51.5, -0.12],
    mapZoom: 10,
    certificateName: 'EPC',
    certificateShortName: 'EPC',
    currencySymbol: '£',
    energyPrice: 0.12,
    engineProfile: 'uk',
    dataUrl: `${base}data/uk-london.json`,
    sourceName: 'EPC register (DLUHC)',
    disclaimer:
      'Real EPC certificates (DLUHC). Coordinates are postcode centroids with a small offset; floor counts are modelled. Annual costs use EPC heating/hot-water/lighting fields when present, otherwise a fuel-aware UK tariff.',
    content: {
      regulation: REGULATION_UK,
      gestures: GESTURES_UK,
      heatwave: HEATWAVE_RECS_UK,
    },
  },
  {
    id: 'us',
    name: {
      fr: 'États-Unis · New York',
      en: 'United States · New York',
    },
    shortName: { fr: 'États-Unis', en: 'United States' },
    language: 'en',
    locale: 'en-US',
    mapCenter: [40.75, -73.98],
    mapZoom: 11,
    certificateName: 'HERS Index / LL84',
    certificateShortName: 'HERS',
    currencySymbol: '$',
    energyPrice: 0.18,
    engineProfile: 'us',
    dataUrl: `${base}data/us-nyc.json`,
    sourceName: 'NYC LL84 / PLUTO',
    disclaimer:
      'Real Manhattan footprints (DoITT, PLUTO). Energy use is measured for the 71% of buildings covered by LL84 benchmarking, modelled otherwise. Large buildings show whole-building costs; per-m² figures are also displayed.',
    content: {
      regulation: REGULATION_US,
      gestures: GESTURES_US,
      heatwave: HEATWAVE_RECS_US,
    },
  },
  {
    id: 'nl',
    name: {
      fr: 'Pays-Bas · Randstad',
      en: 'Netherlands · Randstad',
    },
    shortName: { fr: 'Pays-Bas', en: 'Netherlands' },
    language: 'en',
    locale: 'en-NL',
    mapCenter: [52.15, 4.65],
    mapZoom: 9,
    certificateName: 'Energielabel',
    certificateShortName: 'Energielabel',
    currencySymbol: '€',
    energyPrice: 0.18,
    engineProfile: 'nl',
    dataUrl: `${base}data/nl.json`,
    sourceName: 'PDOK BAG',
    disclaimer:
      'Real BAG buildings (addresses, bouwjaar, areas) from PDOK. Energielabels and envelope/system attributes are modelled pending an EP-online API key; summer comfort is modelled (TOjuli proxy).',
    content: {
      regulation: REGULATION_NL,
      gestures: GESTURES_NL,
      heatwave: HEATWAVE_RECS_NL,
    },
  },
  {
    id: 'dk',
    name: {
      fr: 'Danemark · Copenhague',
      en: 'Denmark · Copenhagen',
    },
    shortName: { fr: 'Danemark', en: 'Denmark' },
    language: 'en',
    locale: 'da-DK',
    mapCenter: [55.68, 12.55],
    mapZoom: 11,
    certificateName: 'Energimærke',
    certificateShortName: 'Energimærke',
    currencySymbol: 'kr.',
    energyPrice: 1.0,
    engineProfile: 'dk',
    dataUrl: `${base}data/dk.json`,
    sourceName: 'EMOData (Energistyrelsen)',
    disclaimer:
      'Real energy labels and addresses from the Danish Energy Agency EMOData register (Copenhagen demo area). Envelope attributes, floor counts and summer comfort are modelled. Most homes use district heating (fjernvarme); bills use a fuel-aware DKK tariff, not a flat electricity rate.',
    content: {
      regulation: REGULATION_DK,
      gestures: GESTURES_DK,
      heatwave: HEATWAVE_RECS_DK,
    },
  },
];

export const DEFAULT_REGION_ID: RegionId = 'fr';

export function getRegion(id: RegionId): RegionConfig {
  const region = REGIONS.find((r) => r.id === id);
  if (!region) throw new Error(`Unknown region: ${id}`);
  return region;
}

/** Selector / title label in the active UI language. */
export function regionShortName(region: RegionConfig, language: RegionLanguage): string {
  return region.shortName[language];
}

export function regionFullName(region: RegionConfig, language: RegionLanguage): string {
  return region.name[language];
}
