/**
 * Renovativ AI Map — Datafordeler BBR client (Denmark). SCAFFOLD ONLY.
 *
 * Datafordeleren (datafordeler.dk) is the official Danish state data
 * distribution platform. It exposes the BBR register directly (no wrapper)
 * through REST endpoints and a GraphQL gateway, with per-user API keys.
 *
 * Base URL: https://api.datafordeler.dk
 * Planned endpoints:
 *  - REST: /BBR/BBRPublic/1/rest/bygning  (BBR Public service, building data)
 *  - REST: /BBR/BBRPublic/1/rest/enhed    (units inside a building)
 *  - REST: /BBR/BBRPublic/1/rest/grund    (plots)
 *  - GraphQL: https://graphql.datafordeler.dk/BBR/v1 (schema introspection TBD)
 *
 * Auth: Datafordeler uses HTTP basic auth with the API key as username and an
 * empty password, or `?username=<key>&password=` query parameters (confirm
 * against the official docs before implementation).
 *
 * Status: API key obtained, scaffold only. This is the planned upgrade path
 * from the Lassox wrapper (src/api/bbrLassox.ts): same Building contract out,
 * no wrapper subscription in the middle.
 *
 * TODO (implementation plan):
 *  1. getBuildingByAddress(road, houseNo, postcode): resolve address to a BBR
 *     building via DAWA (https://dawa.aws.dk) -> jordstykke/BFE, then query
 *     BBRPublic bygning filtered on the BFE number.
 *  2. getBuildingById(bbrBuildingId): direct bygning lookup by BBR UUID.
 *  3. getBuildingByBfe(bfeNumber): bygning list for a cadastral property —
 *     this replaces the Lassox property/summary call 1:1.
 *  4. GraphQL variant: single query fetching bygning + etager + enheder in
 *     one round trip; evaluate against the three REST calls above.
 *  5. Reuse mapSummaryToBuilding-style mapping from bbrLassox.ts — factor the
 *     BBR-field mapping into a shared module when this client lands.
 */

import type { Building } from '../types';

export const DATAFORDELER_BASE_URL = 'https://api.datafordeler.dk';
export const DATAFORDELER_GRAPHQL_URL = 'https://graphql.datafordeler.dk/BBR/v1';

function viteEnv(key: string): string | undefined {
  return (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[key];
}

export function getDatafordelerApiKey(): string | undefined {
  return viteEnv('VITE_DATAFORDELER_API_KEY');
}

/** TODO: implement — BBR building by BFE (cadastral) number via BBRPublic REST. */
export async function getBuildingByBfe(_bfeNumber: string): Promise<Building> {
  throw new Error('bbrDatafordeler.getBuildingByBfe: not implemented (scaffold only)');
}

/** TODO: implement — BBR building by BBR UUID via BBRPublic REST. */
export async function getBuildingById(_bbrBuildingId: string): Promise<Building> {
  throw new Error('bbrDatafordeler.getBuildingById: not implemented (scaffold only)');
}

/** TODO: implement — GraphQL query fetching bygning + etager + enheder in one call. */
export async function getBuildingGraphql(_bfeNumber: string): Promise<Building> {
  throw new Error('bbrDatafordeler.getBuildingGraphql: not implemented (scaffold only)');
}
