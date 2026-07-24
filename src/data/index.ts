/**
 * data/index.ts — chargement asynchrone des jeux de donnees par region.
 *
 * Chaque region sert un JSON reel depuis public/data (BDNB departement 06,
 * registre EPC londonien, LL84/PLUTO new-yorkais). Les fichiers sont
 * telecharges a la demande puis gardes en cache memoire.
 */

import type { Building, EnergyLabel } from '../types';
import { getRegion, type RegionId } from '../regions';

const cache = new Map<RegionId, Building[]>();
const pending = new Map<RegionId, Promise<Building[]>>();

const SEARCH_LIMIT = 20;

/** Lowercase + strip accents so "Rivoli", "rivoli" and "république"/"republique" all match. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export interface DataStats {
  total: number;
  perLabel: Record<EnergyLabel, number>;
  perCity: Record<string, number>;
}

/**
 * Telecharge (ou relit depuis le cache) les batiments d'une region.
 * Les appels concurrents partagent la meme promesse.
 */
export function loadRegion(regionId: RegionId): Promise<Building[]> {
  const cached = cache.get(regionId);
  if (cached) return Promise.resolve(cached);

  const running = pending.get(regionId);
  if (running) return running;

  const region = getRegion(regionId);
  const promise = fetch(region.dataUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} on ${region.dataUrl}`);
      return res.json() as Promise<unknown>;
    })
    .then((json) => {
      const buildings = json as Building[];
      cache.set(regionId, buildings);
      pending.delete(regionId);
      return buildings;
    })
    .catch((err) => {
      pending.delete(regionId);
      throw err;
    });

  pending.set(regionId, promise);
  return promise;
}

/** Batiments deja en cache pour une region, undefined si jamais charges. */
export function getCached(regionId: RegionId): Building[] | undefined {
  return cache.get(regionId);
}

/**
 * Substring search on address, city and postcode.
 * Case- and accent-insensitive, capped at 20 results.
 */
export function searchIn(buildings: Building[], query: string): Building[] {
  const q = normalize(query.trim());
  if (q.length === 0) return [];
  const results: Building[] = [];
  for (const b of buildings) {
    if (
      normalize(b.address).includes(q) ||
      normalize(b.city).includes(q) ||
      b.postcode.includes(q)
    ) {
      results.push(b);
      if (results.length >= SEARCH_LIMIT) break;
    }
  }
  return results;
}

/** Counts per certificate label (A to G) and per city, for the stats bar. */
export function statsOf(buildings: Building[]): DataStats {
  const perLabel: Record<EnergyLabel, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 };
  const perCity: Record<string, number> = {};
  for (const b of buildings) {
    perLabel[b.certificate.label] += 1;
    perCity[b.city] = (perCity[b.city] ?? 0) + 1;
  }
  return { total: buildings.length, perLabel, perCity };
}
