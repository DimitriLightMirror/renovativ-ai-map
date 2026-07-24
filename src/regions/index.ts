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

export type RegionId = 'fr' | 'uk' | 'us';
export type RegionLanguage = 'fr' | 'en';

export interface RegionContent {
  regulation: RegulationItem[];
  gestures: RenovationGesture[];
  heatwave: HeatwaveRecommendation[];
}

export interface RegionConfig {
  id: RegionId;
  /** Nom complet affiche, ex. "France · Alpes-Maritimes (06)". */
  name: string;
  /** Libelle court du selecteur pays dans l'en-tete. */
  shortName: string;
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
  /** Prix de l'energie dans la devise du pays, par kWh. */
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
    name: 'France · Alpes-Maritimes (06)',
    shortName: 'France',
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
    name: 'Royaume-Uni · Londres',
    shortName: 'Royaume-Uni',
    language: 'en',
    locale: 'en-GB',
    mapCenter: [51.5, -0.12],
    mapZoom: 10,
    certificateName: 'EPC',
    certificateShortName: 'EPC',
    currencySymbol: '£',
    energyPrice: 0.15,
    engineProfile: 'uk',
    dataUrl: `${base}data/uk-london.json`,
    sourceName: 'EPC register (DLUHC)',
    disclaimer:
      'Real EPC certificates (DLUHC). Coordinates are postcode centroids with a small offset; floor counts are modelled.',
    content: {
      regulation: REGULATION_UK,
      gestures: GESTURES_UK,
      heatwave: HEATWAVE_RECS_UK,
    },
  },
  {
    id: 'us',
    name: 'États-Unis · New York',
    shortName: 'États-Unis',
    language: 'en',
    locale: 'en-US',
    mapCenter: [40.75, -73.98],
    mapZoom: 11,
    certificateName: 'HERS Index / LL84',
    certificateShortName: 'HERS',
    currencySymbol: '$',
    energyPrice: 0.16,
    engineProfile: 'us',
    dataUrl: `${base}data/us-nyc.json`,
    sourceName: 'NYC LL84 / PLUTO',
    disclaimer:
      'Real Manhattan footprints (DoITT, PLUTO). Energy use is measured for the 71% of buildings covered by LL84 benchmarking, modelled otherwise.',
    content: {
      regulation: REGULATION_US,
      gestures: GESTURES_US,
      heatwave: HEATWAVE_RECS_US,
    },
  },
];

export const DEFAULT_REGION_ID: RegionId = 'fr';

export function getRegion(id: RegionId): RegionConfig {
  const region = REGIONS.find((r) => r.id === id);
  if (!region) throw new Error(`Unknown region: ${id}`);
  return region;
}
