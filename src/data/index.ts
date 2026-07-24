/**
 * Renovativ AI Map — typed loader for the Dutch dataset (branch `netherlands`).
 *
 * The dataset is produced by scripts/fetch-netherlands.mjs from the PDOK BAG
 * (Basisregistratie Adressen en Gebouwen) WFS v2.0, keyless national open
 * data: ~8000 real buildings across Amsterdam, Rotterdam, Den Haag and
 * Utrecht, reprojected from RD New (EPSG:28992) to WGS84.
 *
 * IMPORTANT: every energielabel in this dataset is ESTIMATED, modelled from
 * bouwjaar-era Dutch archetypes, because EP-online (RVO) requires an API key
 * and no keyless energielabel source exists. Live per-address labels can be
 * fetched at runtime through src/api/epOnline.ts once a key is configured.
 * The data conforms to the Building interface in src/types/index.ts.
 *
 * No runtime dependencies: pure TypeScript over the bundled JSON.
 */

import type { Building, EnergyLabel } from '../types';
import buildingsJson from './buildings-nl.json';

const BUILDINGS: Building[] = buildingsJson as unknown as Building[];

const SEARCH_LIMIT = 20;

/** Lowercase + strip accents so "Den Haag", "den haag" and "'s-Gravenhage" all match. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export interface DataStats {
  total: number;
  perLabel: Record<EnergyLabel, number>;
  perCity: Record<string, number>;
}

/** All buildings, in dataset order. The array is shared; treat it as read-only. */
export function getBuildings(): Building[] {
  return BUILDINGS;
}

export function getBuildingById(id: string): Building | undefined {
  return BUILDINGS.find((b) => b.id === id);
}

/**
 * Substring search on address, city and postcode.
 * Case-insensitive, capped at 20 results.
 */
export function searchBuildings(query: string): Building[] {
  const q = normalize(query.trim());
  if (q.length === 0) return [];
  const results: Building[] = [];
  for (const b of BUILDINGS) {
    if (
      normalize(b.address).includes(q) ||
      normalize(b.city).includes(q) ||
      b.postcode.includes(q.toUpperCase())
    ) {
      results.push(b);
      if (results.length >= SEARCH_LIMIT) break;
    }
  }
  return results;
}

/** Counts per energielabel (A to G) and per city, for the map legend and dashboards. */
export function getStats(): DataStats {
  const perLabel: Record<EnergyLabel, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 };
  const perCity: Record<string, number> = {};
  for (const b of BUILDINGS) {
    perLabel[b.certificate.label] += 1;
    perCity[b.city] = (perCity[b.city] ?? 0) + 1;
  }
  return { total: BUILDINGS.length, perLabel, perCity };
}
