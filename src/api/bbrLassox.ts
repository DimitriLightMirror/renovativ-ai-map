/**
 * Renovativ AI Map — Lassox BBR wrapper client (Denmark).
 *
 * Lassox hosts a REST wrapper over the Danish building register (BBR —
 * Bygnings- og Boligregistret). We use it as the first working Denmark data
 * source because a single key unlocks BBR (and later EMO energy labels)
 * through one uniform API.
 *
 * Docs (fetched 2026-07-24):
 *  - Endpoint + sample response: https://docs.lassox.com/data-apis/bbr/
 *  - Auth: https://docs.lassox.com/gettingstarted/ — the API key is sent as
 *    the HTTP header `lasso-api-key: <key>` (alternative: `?accessKey=<key>`
 *    query parameter). We use the header.
 *
 * Base URL: https://api.lassox.com/data/bbr
 *
 * Coordinates: BBR coordinates in the sample are "UTM Euref89 (WGS 84)"
 * (coordinateSystemCode 5) which for Denmark means ETRS89 / UTM zone 32N
 * (EPSG:25832). We convert to WGS84 lat/lng with the standard inverse
 * transverse Mercator formulas implemented locally (no extra dependency).
 */

import type { Building, EnergyLabel, HeatingEnergy, UsageType } from '../types';

export const LASSOX_BASE_URL = 'https://api.lassox.com/data/bbr';

/**
 * Read a Vite env var without crashing outside Vite (e.g. when Node runs this
 * module directly for parser tests — `import.meta.env` is undefined there).
 */
function viteEnv(key: string): string | undefined {
  return (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[key];
}

// ---------------------------------------------------------------------------
// Response shapes (partial — only the fields we consume; Lassox returns more)
// ---------------------------------------------------------------------------

export interface LassoxAddress {
  addressText: string | null;
  streetName: string | null;
  houseNo: string | null;
  postalCode: string | null;
  city: string | null;
  municipalityCode: string | null;
  municipalityName: string | null;
  regionName: string | null;
  cadastralNumber: string | null;
}

export interface LassoxUnit {
  totalArea: number | null;
  areaForResidence: number | null;
  numberOfRooms: number | null;
}

export interface LassoxBuilding {
  id: string;
  buildingNumber: number | null;
  buildingUsageCode: number | null;
  buildingUsage: string | null;
  constructionYear: number | null;
  reconstructionOrExtensionYear: number | null;
  outerWallMaterial: string | null;
  roofCoverMaterial: string | null;
  totalBuildingArea: number | null;
  residentialBuildingArea: number | null;
  businessBuildingArea: number | null;
  builtArea: number | null;
  numberOfFloors: number | null;
  floors: { buildingFloorDesignation: string | null; totalFloorArea: number | null }[] | null;
  units: LassoxUnit[] | null;
  heatingInstallationCode: number | null;
  heatingInstallation: string | null;
  heatingMediumCode: number | null;
  heatingMedium: string | null;
  areaOfExternalWallInsulation: number | null;
  totalBasementArea: number | null;
  totalRoofFloorArea: number | null;
  usedRoofFloorArea: number | null;
  numberOfHomesWithKitchen: number | null;
  numberOfHomesWithoutKitchen: number | null;
  /** "POINT(<easting> <northing>)" in the CRS named by coordinateSystem. */
  coordinate: string | null;
  coordinateSystem: string | null;
  accessAddress: LassoxAddress | null;
}

export interface LassoxPropertyRelation {
  bfeNumber: number | null;
  propertyNumber: number | null;
  municipalityCode: number | null;
}

export interface LassoxPlot {
  accessAddress: LassoxAddress | null;
}

/** Top-level shape of GET /property/summary (see docs sample). */
export interface LassoxPropertySummary {
  propertyRelations: LassoxPropertyRelation[] | null;
  plots: LassoxPlot[] | null;
  buildings: LassoxBuilding[] | null;
}

// ---------------------------------------------------------------------------
// ETRS89 / UTM zone 32N (EPSG:25832) → WGS84 lat/lng
// ---------------------------------------------------------------------------

/**
 * Inverse transverse Mercator for UTM zone 32N on the GRS80 ellipsoid.
 * Standard Snyder formulas; accuracy well below marker level (< 0.1 m).
 */
export function utm32ToWgs84(easting: number, northing: number): { lat: number; lng: number } {
  const a = 6378137.0; // GRS80 semi-major axis
  const f = 1 / 298.257222101; // GRS80 flattening
  const k0 = 0.9996;
  const lonOrigin = (9 * Math.PI) / 180; // zone 32 central meridian: 9°E
  const falseEasting = 500000;

  const e2 = f * (2 - f); // first eccentricity squared
  const ep2 = e2 / (1 - e2); // second eccentricity squared
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const x = easting - falseEasting;
  const m = northing / k0;
  const mu = m / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);
  const n1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
  const t1 = tanPhi1 * tanPhi1;
  const c1 = ep2 * cosPhi1 * cosPhi1;
  const r1 = (a * (1 - e2)) / (1 - e2 * sinPhi1 * sinPhi1) ** 1.5;
  const d = x / (n1 * k0);

  const lat =
    phi1 -
    ((n1 * tanPhi1) / r1) *
      (d ** 2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * ep2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * ep2 - 3 * c1 * c1) * d ** 6) / 720);

  const lng =
    lonOrigin +
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * ep2 + 24 * t1 * t1) * d ** 5) / 120) /
      cosPhi1;

  return { lat: (lat * 180) / Math.PI, lng: (lng * 180) / Math.PI };
}

function wgs84FromBbr(building: LassoxBuilding): { lat: number; lng: number } {
  const match = building.coordinate?.match(/POINT\(\s*([\d.]+)\s+([\d.]+)\s*\)/);
  if (!match) return { lat: 0, lng: 0 }; // unmapped: building carries no coordinate
  return utm32ToWgs84(Number(match[1]), Number(match[2]));
}

// ---------------------------------------------------------------------------
// Field mapping BBR → Building contract
// ---------------------------------------------------------------------------

/**
 * BBR BYG021 usage codes → Renovativ usage. Coarse but documented:
 *  110–139 detached/terraced housing, 140–199 multi-storey housing,
 *  400–439 offices, 440–499 commerce, 520–539 schools/institutions.
 */
function mapUsage(code: number | null): UsageType {
  if (code === null) return 'residential_individual'; // unmapped: no usage code
  if (code >= 110 && code <= 139) return 'residential_individual';
  if (code >= 140 && code <= 199) return 'residential_collective';
  if (code >= 400 && code <= 439) return 'tertiary_office';
  if (code >= 440 && code <= 499) return 'tertiary_commerce';
  if (code >= 520 && code <= 539) return 'tertiary_school';
  return 'residential_individual'; // fallback for unmapped BBR codes
}

/**
 * BBR heating installation (BYG056) + heating medium (BYG054) → energy.
 * Installation 1 = district heating; 5 = heat pump; 7 = electric panels.
 * Otherwise fall back on the medium: 1 electricity, 2/6 gas, 3 oil, 4/5 solid.
 */
function mapHeating(b: LassoxBuilding): { kind: string; energy: HeatingEnergy } {
  const inst = b.heatingInstallationCode;
  if (inst === 1) return { kind: 'fjernvarme', energy: 'reseau_chaleur' };
  if (inst === 5) return { kind: 'varmepumpe', energy: 'pac' };
  if (inst === 7) return { kind: 'elpaneler', energy: 'electricite' };
  if (inst === 3) return { kind: 'brændeovn', energy: 'bois' };
  switch (b.heatingMediumCode) {
    case 1:
      return { kind: 'elvarme', energy: 'electricite' };
    case 2:
    case 6:
      return { kind: 'gaskedel', energy: 'gaz_naturel' };
    case 3:
      return { kind: 'oliekedel', energy: 'fioul' };
    case 4:
    case 5:
      return { kind: 'fast_brændsel', energy: 'bois' };
    case 7:
      return { kind: 'fjernvarme', energy: 'reseau_chaleur' };
    default:
      return { kind: 'unknown', energy: 'electricite' }; // unmapped: BBR says nothing
  }
}

/**
 * Map a Lassox property summary onto the shared Building contract.
 * Picks the main building (first entry; BBR lists the main building last in
 * the docs sample, so callers can pass an index). Fields with no BBR
 * equivalent are left at 0/null and marked with an `unmapped:` comment —
 * energy labels and consumption come from EMO, not BBR, and must never be
 * merged here.
 */
export function mapSummaryToBuilding(summary: LassoxPropertySummary, buildingIndex = 0): Building {
  const buildings = summary.buildings ?? [];
  if (buildings.length === 0) throw new Error('Lassox summary contains no buildings');
  const b = buildings[Math.min(buildingIndex, buildings.length - 1)];

  const address = b.accessAddress ?? summary.plots?.[0]?.accessAddress ?? null;
  const relation = summary.propertyRelations?.[0] ?? null;
  const { lat, lng } = wgs84FromBbr(b);
  const heating = mapHeating(b);

  // BBR uses 1000 as an "unknown year" sentinel — treat it as unknown.
  const constructionYear =
    b.constructionYear && b.constructionYear > 1000 ? b.constructionYear : 0; // 0 = unknown

  const units =
    (b.numberOfHomesWithKitchen ?? 0) + (b.numberOfHomesWithoutKitchen ?? 0) ||
    b.units?.length ||
    0;

  const livingArea =
    b.residentialBuildingArea ??
    b.units?.reduce((sum, u) => sum + (u.areaForResidence ?? 0), 0) ??
    0;

  const wallInsulated = (b.areaOfExternalWallInsulation ?? 0) > 0;

  return {
    id: `bbr-${b.id}`,
    nationalDbId: relation?.bfeNumber?.toString() ?? '',
    registryId: relation
      ? `${relation.municipalityCode}-${relation.propertyNumber}`
      : '',
    address: address?.addressText ?? '',
    city: address?.city ?? '',
    postcode: address?.postalCode ?? '',
    department: address?.municipalityName ?? '', // closest equivalent: kommune
    lat,
    lng,
    usage: mapUsage(b.buildingUsageCode),
    constructionYear,
    footprintAreaM2: b.builtArea ?? 0,
    floors: b.numberOfFloors ?? b.floors?.length ?? 0,
    heightM: 0, // unmapped: no BBR equivalent
    livingAreaM2: livingArea ?? 0,
    housingUnits: units,
    envelope: {
      wallMaterial: b.outerWallMaterial ?? '',
      wallInsulation: wallInsulated ? 'ite' : 'aucune', // from areaOfExternalWallInsulation
      uWall: 0, // unmapped: no BBR equivalent
      roofType: b.roofCoverMaterial ? 'inclinee' : '', // BBR stores cover material, not shape
      uRoof: 0, // unmapped: no BBR equivalent
      uFloor: 0, // unmapped: no BBR equivalent
      glazingRatio: 0, // unmapped: no BBR equivalent
      glazingType: '', // unmapped: no BBR equivalent
      solarProtection: false, // unmapped: no BBR equivalent
      inertia: 'moyenne', // unmapped: no BBR equivalent — neutral default
    },
    systems: {
      heating: { kind: heating.kind, energy: heating.energy, ageYears: 0 }, // ageYears unmapped
      heatingSecondary: null, // BBR additionalHeating not mapped yet
      dhw: { kind: heating.kind, energy: heating.energy, ageYears: 0 }, // BBR does not split DHW
      cooling: null, // unmapped: no BBR equivalent
      ventilation: 'naturelle', // unmapped: no BBR equivalent — default
      hasCeilingFans: false, // unmapped: no BBR equivalent
      pvSurfaceM2: 0, // unmapped: no BBR equivalent (technicalInstallations not parsed yet)
    },
    certificate: {
      label: 'D' as EnergyLabel, // unmapped: energy label lives in EMO, not BBR — placeholder
      ep: 0, // unmapped: no BBR equivalent (EMO data)
      ges: 0, // unmapped: no BBR equivalent (EMO data)
      gesLabel: 'D' as EnergyLabel, // unmapped: placeholder
    },
    comfort: { dh2025: 0, dh2050: 0, dh2100: 0 }, // unmapped: needs Danish climate projections
    annualConsumptionKwhEp: 0, // unmapped: no BBR equivalent (EMO data)
    annualGesKgCo2: 0, // unmapped: no BBR equivalent (EMO data)
    annualEnergyCostEur: 0, // unmapped: no BBR equivalent
  };
}

// ---------------------------------------------------------------------------
// HTTP client
// ---------------------------------------------------------------------------

export class LassoxError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'LassoxError';
    this.status = status;
  }
}

/**
 * GET /property/summary?propertynumber={...}&municipality={...}
 * Auth: `lasso-api-key` header (source: https://docs.lassox.com/gettingstarted/).
 * Throws LassoxError on non-2xx (404 = "No results matching the parameters").
 */
export async function getPropertySummary(
  propertyNumber: string,
  municipalityCode: string,
): Promise<LassoxPropertySummary> {
  const apiKey = viteEnv('VITE_LASSOX_API_KEY');
  if (!apiKey) {
    throw new LassoxError('VITE_LASSOX_API_KEY is not set', 0);
  }
  const url =
    `${LASSOX_BASE_URL}/property/summary` +
    `?propertynumber=${encodeURIComponent(propertyNumber)}` +
    `&municipality=${encodeURIComponent(municipalityCode)}`;
  const res = await fetch(url, { headers: { 'lasso-api-key': apiKey } });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { errorMessage?: string };
      if (body.errorMessage) detail = body.errorMessage;
    } catch {
      // keep statusText
    }
    throw new LassoxError(`Lassox BBR request failed: ${detail}`, res.status);
  }
  return (await res.json()) as LassoxPropertySummary;
}

/** Fetch a property summary and map it to the shared Building contract. */
export async function getBuildingFromLassox(
  propertyNumber: string,
  municipalityCode: string,
): Promise<Building> {
  return mapSummaryToBuilding(await getPropertySummary(propertyNumber, municipalityCode));
}

/**
 * Demo property for the first Denmark demo: the documented sample from
 * https://docs.lassox.com/data-apis/bbr/ (municipality 157 Gentofte).
 * Overridable via env for live testing.
 */
const DEMO_PROPERTY_NUMBER = viteEnv('VITE_LASSOX_DEMO_PROPERTY') ?? '79972';
const DEMO_MUNICIPALITY_CODE = viteEnv('VITE_LASSOX_DEMO_MUNICIPALITY') ?? '157';

/**
 * Nearest-property lookup for map clicks.
 *
 * LIMITATION (v1): the Lassox BBR wrapper documents lookup by
 * propertynumber + municipality only — there is no documented reverse
 * geocoding endpoint on this wrapper. Until a reverse lookup is wired
 * (planned: resolve the click point to an address via the free DAWA address
 * API, then to a BFE number), map clicks in Denmark mode return the demo
 * property above. The lat/lng parameters are accepted now so the signature
 * does not change when the real lookup lands.
 */
export async function getNearestBuilding(_lat: number, _lng: number): Promise<Building> {
  return getBuildingFromLassox(DEMO_PROPERTY_NUMBER, DEMO_MUNICIPALITY_CODE);
}
