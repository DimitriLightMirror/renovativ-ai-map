/**
 * epOnline.ts — runtime client for the Dutch energielabel database
 * (EP-online, administered by RVO) via the overheid.io v3 wrapper.
 *
 *   Base: https://api.overheid.io/v3/energielabels
 *   Docs: https://overheid.io/documentatie/v3/energielabels
 *
 * Auth: an API key is REQUIRED (request one via RVO / overheid.io). The key
 * is read from `import.meta.env.VITE_EPONLINE_API_KEY` (see .env.example).
 * No key is bundled; every method throws a clear error until one is set.
 *
 * The bundled demo dataset (src/data/buildings-nl.json) does NOT use this
 * client: it is built from the keyless PDOK BAG WFS instead, with energie-
 * labels modelled from bouwjaar archetypes. This client exists so the app
 * can swap to real, per-address energielabels at runtime once a key is set.
 */

const BASE_URL = 'https://api.overheid.io/v3/energielabels';

/** PDOK Locatieserver (keyless) — used to resolve postcodes for radius search. */
const LOCATIESERVER_REVERSE =
  'https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse';

/** Dutch energielabel classes, from best (A+++) to worst (G). */
export type EnergieKlasse =
  | 'A+++'
  | 'A++'
  | 'A+'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G';

/** Summary row as returned by the list endpoint. */
export interface EnergielabelSummary {
  slug: string;
  postcode: string;
  huisNummer: number;
  huisNummerToevoeging?: string;
  huisNummerLetter?: string;
  energieKlasse: EnergieKlasse;
  locatie?: { lat: number; lon: number };
}

/** Full label record (detail endpoint), NTA 8800 fields included. */
export interface EnergielabelDetail {
  slug: string;
  bagVerblijfsobjectId: number;
  bagPandIds: number[];
  postcode: string;
  huisNummer: number;
  huisNummerToevoeging?: string;
  huisNummerLetter?: string;
  energieKlasse: EnergieKlasse;
  bouwjaar?: number;
  gebouwKlasse?: string;
  berekeningType?: string;
  status?: string;
  registratieDatum?: string;
  geldigTot?: string;
  /** kWh/m2/yr primary fossil energy (BENG 2 style indicator). */
  primaireFossieleEnergie?: number;
  /** kWh/m2/yr energy demand (BENG 1 style indicator). */
  energieBehoefte?: number;
  /** kgCO2/m2/yr. */
  berekendeCO2Emissie?: number;
  /** Share of renewable energy, percent (BENG 3 style indicator). */
  aandeelHernieuwbareEnergie?: number;
  /** TOjuli overheating indicator (NTA 8800); limit for new dwellings is 1.10. */
  temperatuurOverschrijding?: number;
  gebruiksoppervlakteThermischeZone?: number;
  locatie?: { lat: number; lon: number };
  certificaathouder?: string;
}

export interface PagedResult<T> {
  totalItemCount: number;
  pageCount: number;
  size: number;
  items: T[];
}

interface ListResponse {
  totalItemCount: number;
  pageCount: number;
  size: number;
  _embedded?: { energielabel?: EnergielabelSummary[] };
}

function getApiKey(): string {
  const key = import.meta.env.VITE_EPONLINE_API_KEY as string | undefined;
  if (!key) {
    throw new Error(
      'VITE_EPONLINE_API_KEY is not set. Request an EP-online API key via ' +
        'https://www.rvo.nl/onderwerpen/wetten-en-regels-gebouwen/ep-online ' +
        'and put it in a local .env file (see .env.example).',
    );
  }
  return key;
}

async function request<T>(path: string, params?: URLSearchParams): Promise<T> {
  const url = params ? `${BASE_URL}${path}?${params}` : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      // overheid.io v3 authentication header.
      'ovio-api-key': getApiKey(),
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`EP-online request failed: HTTP ${res.status} for ${url}`);
  }
  return (await res.json()) as T;
}

function toPaged(raw: ListResponse): PagedResult<EnergielabelSummary> {
  return {
    totalItemCount: raw.totalItemCount ?? 0,
    pageCount: raw.pageCount ?? 0,
    size: raw.size ?? 0,
    items: raw._embedded?.energielabel ?? [],
  };
}

/**
 * Search energielabels by postcode (e.g. "1012JL"), optionally narrowed to a
 * house number. Maps to `filters[postcode]` / `filters[huisNummer]`.
 */
export async function searchByPostcode(
  postcode: string,
  opts: { huisNummer?: number; page?: number; size?: number } = {},
): Promise<PagedResult<EnergielabelSummary>> {
  const params = new URLSearchParams();
  params.set('filters[postcode]', postcode.replace(/\s+/g, '').toUpperCase());
  if (opts.huisNummer !== undefined) {
    params.set('filters[huisNummer]', String(opts.huisNummer));
  }
  params.set('fields[]', 'locatie');
  params.set('page', String(opts.page ?? 1));
  params.set('size', String(opts.size ?? 100));
  return toPaged(await request<ListResponse>('', params));
}

/**
 * Fetch the full energielabel record for one addressable unit by its BAG
 * verblijfsobject id (numeric, e.g. 0363010000553603). Uses the list endpoint
 * with `filters[bagVerblijfsobjectId]`, then the detail endpoint for the
 * full NTA 8800 record. Returns null when no label is registered.
 */
export async function getByBuildingId(
  bagVerblijfsobjectId: string | number,
): Promise<EnergielabelDetail | null> {
  const params = new URLSearchParams();
  params.set('filters[bagVerblijfsobjectId]', String(bagVerblijfsobjectId));
  const page = toPaged(await request<ListResponse>('', params));
  const first = page.items[0];
  if (!first) return null;
  return request<EnergielabelDetail>(`/${first.slug}`);
}

/** Fetch a full label record directly by its overheid.io slug. */
export function getBySlug(slug: string): Promise<EnergielabelDetail> {
  return request<EnergielabelDetail>(`/${encodeURIComponent(slug)}`);
}

/** Haversine distance in meters between two WGS84 points. */
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Postcodes present around a point, via the keyless PDOK Locatieserver. */
async function postcodesAround(
  lat: number,
  lon: number,
  radiusMeters: number,
): Promise<string[]> {
  // Sample the center plus a small ring inside the radius so larger radii
  // catch more than one postcode area.
  const offsets: [number, number][] = [[0, 0]];
  if (radiusMeters > 150) {
    const ring = Math.min(radiusMeters * 0.6, 600);
    const dLat = ring / 111320;
    const dLon = ring / (111320 * Math.cos((lat * Math.PI) / 180));
    offsets.push([dLat, 0], [-dLat, 0], [0, dLon], [0, -dLon]);
  }
  const found = new Set<string>();
  for (const [dLat, dLon] of offsets) {
    const res = await fetch(
      `${LOCATIESERVER_REVERSE}?lat=${lat + dLat}&lon=${lon + dLon}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) continue;
    const json = (await res.json()) as {
      response?: { docs?: { postcode?: string }[] };
    };
    for (const doc of json.response?.docs ?? []) {
      if (doc.postcode) found.add(doc.postcode.replace(/\s+/g, '').toUpperCase());
    }
  }
  return [...found];
}

export interface EnergielabelGeoJson {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: {
      slug: string;
      postcode: string;
      huisNummer: number;
      energieKlasse: EnergieKlasse;
      distanceMeters: number;
    };
  }[];
}

/**
 * Radius search around a WGS84 point, returned as a GeoJSON-ish
 * FeatureCollection. The overheid.io API has no native geo filter, so this
 * resolves candidate postcodes through the keyless PDOK Locatieserver, pulls
 * labels per postcode, and filters client-side on the `locatie` field with
 * a haversine distance. Results without coordinates are dropped.
 */
export async function searchByRadius(
  lat: number,
  lon: number,
  radiusMeters: number,
): Promise<EnergielabelGeoJson> {
  const postcodes = await postcodesAround(lat, lon, radiusMeters);
  const features: EnergielabelGeoJson['features'] = [];
  for (const postcode of postcodes) {
    const page = await searchByPostcode(postcode);
    for (const item of page.items) {
      if (!item.locatie) continue;
      const d = haversineMeters(lat, lon, item.locatie.lat, item.locatie.lon);
      if (d > radiusMeters) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [item.locatie.lon, item.locatie.lat] },
        properties: {
          slug: item.slug,
          postcode: item.postcode,
          huisNummer: item.huisNummer,
          energieKlasse: item.energieKlasse,
          distanceMeters: Math.round(d),
        },
      });
    }
  }
  features.sort(
    (a, b) => a.properties.distanceMeters - b.properties.distanceMeters,
  );
  return { type: 'FeatureCollection', features };
}

/**
 * Map the Dutch A+++..G scale onto the shared A..G EnergyLabel contract.
 * A+++, A++, A+ and A all collapse onto 'A' (documented in src/engine/dpe.ts).
 */
export function toSharedLabel(klasse: EnergieKlasse): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' {
  if (klasse.startsWith('A')) return 'A';
  return klasse as 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
}
