/**
 * Renovativ AI Map — EMO (Energimærkningsordningen) client. SCAFFOLD ONLY.
 *
 * EMO (Energimaerkning Online) is the Danish energy performance certificate
 * register, run by the Danish Energy Agency (Energistyrelsen). It holds the
 * A2020–G energy label, calculated consumption and improvement proposals per
 * building — the fields BBR does NOT have (our `certificate` and annual
 * consumption/GES fields).
 *
 * Info: https://ens.dk/analyser-og-statistik/energimaerkningsdata
 *
 * Status: API key requested from emo-info@ens.dk, pending as of 2026-07-24.
 *
 * IMPORTANT: do NOT merge BBR and EMO data in this codebase. BBR supplies
 * building characteristics (address, year, areas, heating); EMO supplies the
 * energy certificate. They are joined by BFE/address at the data-pipeline
 * level later, never inside the API clients.
 *
 * TODO (implementation plan, once the key arrives):
 *  1. getCertificateByAddress(addressText): find the energimærkning for an
 *     address; EMO lookup keys TBD from the key grant documentation.
 *  2. getCertificateByBuildingId(bbrBuildingId): certificate linked to a BBR
 *     building id, if the EMO API supports the join directly.
 *  3. Map label + kWh/m² + improvement proposals onto CertificateScore and
 *     the renovation tab. Danish labels are A2020/A2015/A2010/B/C/D/E/F/G —
 *     decide the mapping onto our A–G EnergyLabel before implementation.
 */

import type { CertificateScore } from '../types';

export const EMO_INFO_URL = 'https://ens.dk/analyser-og-statistik/energimaerkningsdata';

function viteEnv(key: string): string | undefined {
  return (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[key];
}

export function getEmoApiKey(): string | undefined {
  return viteEnv('VITE_EMO_API_KEY');
}

/** TODO: implement once the EMO key is granted — certificate lookup by address. */
export async function getCertificateByAddress(_addressText: string): Promise<CertificateScore> {
  throw new Error('emo.getCertificateByAddress: not implemented (key pending, scaffold only)');
}

/** TODO: implement once the EMO key is granted — certificate lookup by BBR building id. */
export async function getCertificateByBuildingId(_bbrBuildingId: string): Promise<CertificateScore> {
  throw new Error('emo.getCertificateByBuildingId: not implemented (key pending, scaffold only)');
}
