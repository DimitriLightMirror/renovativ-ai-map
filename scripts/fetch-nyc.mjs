/**
 * Renovativ AI Map — New York City (Manhattan) ingest pipeline.
 *
 * Builds public/data/us-nyc.json from REAL NYC open data only (no invented
 * buildings). Follows the same pipeline style as scripts/ingest-bdnb.mjs.
 *
 * Usage:
 *   node scripts/fetch-nyc.mjs
 *
 * Sources (all NYC Open Data / Socrata, no API key required):
 *
 *   A. DoITT Building Footprints — dataset 5zhs-2jue ("BUILDING")
 *      https://data.cityofnewyork.us/resource/5zhs-2jue.json
 *      Used for: per-building footprint area (shape_area, square feet,
 *      NYC State Plane — converted x0.09290304 to m2), roof height
 *      (height_roof, feet -> m x0.3048), construction_year, and the building
 *      centroid (the_geom is GeoJSON MultiPolygon already in WGS84 — no
 *      reprojection needed; centroid computed with a shoelace average of the
 *      largest polygon ring). One row per footprint; we keep the largest
 *      footprint per mappluto_bbl as "the building".
 *
 *   B. LL84 — "NYC Building Energy and Water Data Disclosure for Local Law 84
 *      2023 to Present" — dataset 5zyy-y8am (calendar years 2022-present).
 *      https://data.cityofnewyork.us/resource/5zyy-y8am.json
 *      Used for: REAL measured energy per building, joined on
 *      nyc_borough_block_and_lot (10-digit BBL) = footprints' mappluto_bbl.
 *      Latest report_year per BBL wins. Fields used:
 *        - site_eui_kbtu_ft ("Site EUI (kBtu/ft^2)") -> certificate.ep
 *          ep = EUI x 3.15459  (1 kBtu/ft2 = 3.15459 kWh/m2)
 *        - total_location_based_ghg (metric tons CO2e) / property_gfa_self_reported
 *          (ft2 x0.09290304 -> m2) -> certificate.ges (kgCO2/m2)
 *        - primary_property_type_self -> usage
 *        - fuel columns (natural_gas_use_kbtu, fuel_oil_2/4/5_6_use_kbtu,
 *          district_steam_use_kbtu, electricity_use_grid_purchase) -> dominant
 *          REAL heating energy.
 *        - address_1, postal_code, year_built as fallbacks.
 *      LL84 only covers buildings > 25,000 ft2, so small buildings have no match.
 *
 *   C. NYC PLUTO — dataset 64uk-42ks (borough='MN').
 *      https://data.cityofnewyork.us/resource/64uk-42ks.json
 *      Used for: address, zipcode, unitsres/unitstotal, numfloors, bldgarea,
 *      lotarea, landuse, bldgclass, yearbuilt, and lot-centroid latitude/longitude
 *      (fallback when footprint geometry could not be fetched).
 *      PLUTO bbl arrives as "1015590019.00000000" -> normalized to 10 digits.
 *
 * Label mapping (HERS-style, documented model):
 *   A HERS-style score is derived from site EUI:  score = EUI(kBtu/ft2) x 1.6,
 *   i.e. HERS 100 reference ~ 62.5 kBtu/ft2-yr site EUI (RESNET 2006 reference
 *   home approximation for US climate zone 4). Bands on the score:
 *   A<=55, B<=70, C<=85, D<=100, E<=115, F<=130, G>130.
 *   gesLabel uses the same bands on an equivalent score computed from GES:
 *   gesScore = (ges / 0.18 kgCO2-per-kWh / 3.15459) x 1.6
 *   (0.18 kgCO2/kWh = NYC blended gas+grid average, documented approximation).
 *
 * MODELLED (estimated) fields — flagged here because the sources lack them:
 *   - For buildings WITHOUT an LL84 match: certificate.ep/ges are ESTIMATED
 *     from construction era (see eraDefaultsNyc table below). Geometry,
 *     address, units and years remain real.
 *   - envelope U-values / insulation / glazing / wall material: era-based NYC
 *     masonry/high-rise defaults (no per-building source exists).
 *   - systems (heating kind/age, dhw, cooling, ventilation) for non-LL84 rows:
 *     era-based NYC model (steam/fuel oil pre-war, gas post-war, AC common
 *     post-1960). For LL84 rows the dominant heating energy is REAL (fuel mix).
 *   - comfort.dh2025/dh2050/dh2100: no summer-comfort indicator exists in any
 *     source. Degree-hours of summer discomfort (without AC) are MODELLED by
 *     the shared model in scripts/comfort-model.mjs (inertia, glazing, era,
 *     urban heat island, height, deterministic noise). Climate horizons:
 *     dh2050 = 1.45 x, dh2100 = 2.05 x (same warming factors as the FR model).
 *   - annualEnergyCostEur: NYC blended energy price ~ $0.15/kWh (documented
 *     rough average; field holds USD on the US branch despite the name).
 *
 * Selection: deterministic (seeded PRNG for tie-breaks only). CAP buildings,
 * per-zipcode quota (largest remainder, proportional to candidate stock) to
 * spread across Manhattan neighborhoods; within each zip, LL84-matched
 * buildings first (capped at 80% of the zip quota so small real buildings
 * without LL84 also appear), then larger buildings by gross area.
 */

import fs from 'node:fs';
import path from 'node:path';
import { computeComfort, calibrateBase } from './comfort-model.mjs';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SOCRATA = 'https://data.cityofnewyork.us/resource';
const FOOTPRINTS = `${SOCRATA}/5zhs-2jue.json`; // DoITT BUILDING footprints
const LL84 = `${SOCRATA}/5zyy-y8am.json`;       // LL84 2023-to-present
const PLUTO = `${SOCRATA}/64uk-42ks.json`;      // PLUTO

const OUT_FILE = path.resolve('public/data/us-nyc.json');
const CAP = 10000;
const PAGE = 5000;

const FT2_TO_M2 = 0.09290304;
const FT_TO_M = 0.3048;
const KBTU_FT2_TO_KWH_M2 = 3.15459; // 1 kBtu/ft2 = 3.15459 kWh/m2

// Manhattan sanity bounds (brief): lat 40.68-40.88, lng -74.03 to -73.90.
const LAT_MIN = 40.68, LAT_MAX = 40.88, LNG_MIN = -74.03, LNG_MAX = -73.90;

// Seeded PRNG (mulberry32) — used ONLY for deterministic tie-breaks/hashes.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const hash01 = (s) => { // deterministic hash of a string -> [0,1)
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
};

// ---------------------------------------------------------------------------
// Socrata helpers (pagination + retry with backoff)
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if (res.status === 429 || res.status === 403 || res.status >= 500) {
        await sleep(1000 * (i + 1) * (i + 1));
        continue;
      }
      throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    } catch (err) {
      if (i === tries - 1) throw err;
      await sleep(1000 * (i + 1) * (i + 1));
    }
  }
  throw new Error('unreachable');
}

/** Paginate a Socrata query with $limit/$offset until a short page. */
async function fetchAll(base, params, orderBy) {
  const out = [];
  let offset = 0;
  for (;;) {
    const url = `${base}?${params}&$limit=${PAGE}&$offset=${offset}` +
      (orderBy ? `&$order=${encodeURIComponent(orderBy)}` : '');
    const page = await fetchJson(url);
    if (!Array.isArray(page)) throw new Error(`Socrata error: ${JSON.stringify(page).slice(0, 300)}`);
    out.push(...page);
    process.stdout.write(`\r  fetched ${out.length} rows...`);
    if (page.length < PAGE) break;
    offset += PAGE;
    await sleep(150); // be polite: anonymous Socrata is throttled
  }
  process.stdout.write('\n');
  return out;
}

const num = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === '' || s === 'Not Available' || s === 'Not Applicable: Standalone Property') return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

/** Normalize any BBL shape ("1015590019.00000000", 1015590019, "15590019") -> 10-char string. */
const normBbl = (v) => {
  const n = num(v);
  if (n == null || n <= 0) return null;
  return String(Math.round(n)).padStart(10, '0');
};

// ---------------------------------------------------------------------------
// Mapping helpers (NYC values -> Building contract)
// ---------------------------------------------------------------------------

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

/** HERS-style score from site EUI (documented in header). */
const hersScoreFromEui = (eui) => eui * 1.6;
function labelFromScore(score) {
  if (score <= 55) return 'A';
  if (score <= 70) return 'B';
  if (score <= 85) return 'C';
  if (score <= 100) return 'D';
  if (score <= 115) return 'E';
  if (score <= 130) return 'F';
  return 'G';
}
const labelFromEp = (ep) => labelFromScore(hersScoreFromEui(ep / KBTU_FT2_TO_KWH_M2));
// GES -> equivalent EUI via NYC blended 0.18 kgCO2/kWh, then same banding.
const labelFromGes = (ges) => labelFromScore(hersScoreFromEui(ges / 0.18 / KBTU_FT2_TO_KWH_M2));

/**
 * MODELLED era defaults for NYC (Manhattan) building stock — used ONLY when
 * the LL84 real measurement is missing. Site-energy primary-equivalent
 * estimates in kWhEP/m2/yr, from typical NYC benchmarking medians per era
 * (pre-war masonry walkups are steam/oil heated and poorly insulated; post-2000
 * towers benefit from energy codes). Envelope U-values are NYC-typical per era.
 */
function eraDefaultsNyc(year) {
  if (year < 1930) return { uWall: 2.1, uRoof: 2.3, uFloor: 1.6, glazing: 'simple', insul: 'aucune', ep: 260, wall: 'brique', inertia: 'lourde' };
  if (year < 1960) return { uWall: 1.8, uRoof: 2.0, uFloor: 1.3, glazing: 'simple', insul: 'aucune', ep: 235, wall: 'brique', inertia: 'lourde' };
  if (year < 1981) return { uWall: 1.4, uRoof: 1.6, uFloor: 1.1, glazing: 'simple', insul: 'aucune', ep: 210, wall: 'beton', inertia: 'moyenne' };
  if (year < 2001) return { uWall: 0.9, uRoof: 1.0, uFloor: 0.9, glazing: 'double', insul: 'iti', ep: 175, wall: 'beton', inertia: 'moyenne' };
  if (year < 2011) return { uWall: 0.6, uRoof: 0.6, uFloor: 0.7, glazing: 'double', insul: 'iti', ep: 140, wall: 'beton', inertia: 'moyenne' };
  return { uWall: 0.4, uRoof: 0.4, uFloor: 0.5, glazing: 'double_renouvele', insul: 'iti', ep: 100, wall: 'beton', inertia: 'moyenne' };
}

// kgCO2 per kWh site energy, NYC fuel factors (documented approximations):
// natural gas 0.20, fuel oil 0.29, ConEd district steam 0.22, NYC grid
// electricity 0.25 (marginal gas-heavy grid).
const GES_FACTOR = {
  gaz_naturel: 0.20, fioul: 0.29, electricite: 0.25,
  reseau_chaleur: 0.22, bois: 0.03, pac: 0.25,
};

/** LL84 self-reported property type -> contract usage. */
function mapUsageFromLl84(type, unitsRes) {
  const t = (type ?? '').toLowerCase();
  if (t.includes('multifamily') || t.includes('residence hall') || t.includes('senior living')) return 'residential_collective';
  if (t.includes('k-12') || t.includes('school') || t.includes('college') || t.includes('university') || t.includes('library')) return 'tertiary_school';
  if (t.includes('office') || t.includes('bank') || t.includes('courthouse') || t.includes('police') || t.includes('fire station') || t.includes('mailing')) return 'tertiary_office';
  if (t.includes('retail') || t.includes('store') || t.includes('supermarket') || t.includes('hotel') || t.includes('restaurant') || t.includes('mall') || t.includes('museum') || t.includes('performing arts') || t.includes('fitness') || t.includes('worship') || t.includes('community center') || t.includes('recreation') || t.includes('wholesale') || t.includes('food') || t.includes('storage')) return 'tertiary_commerce';
  if (t.includes('parking')) return null; // dropped by caller
  if (unitsRes > 0) return 'residential_collective';
  return 'tertiary_office';
}

/** PLUTO landuse code -> contract usage (null = drop: open space/parking/vacant). */
function mapUsageFromLanduse(landuse, unitsRes, unitsTotal, bldgclass) {
  const bc = (bldgclass ?? '').toUpperCase();
  if (bc.startsWith('S')) return 'tertiary_school';
  if (bc.startsWith('O')) return 'tertiary_office';
  if (bc.startsWith('K')) return 'tertiary_commerce';
  switch (landuse) {
    case '01': return 'residential_individual';
    case '02': return 'residential_collective';
    case '03': return 'residential_collective';
    case '04': return unitsRes > 0 ? 'residential_collective' : 'tertiary_commerce';
    case '05': return 'tertiary_office';
    case '06': return 'tertiary_commerce'; // industrial -> closest contract bucket
    case '07': return 'tertiary_office';
    case '08': return 'tertiary_school'; // public facilities & institutions
    default: return unitsRes > 0 && unitsRes >= unitsTotal ? 'residential_collective' : null;
  }
}

/**
 * Dominant REAL heating energy from the LL84 fuel mix (kBtu columns).
 * Electricity is excluded from the thermal comparison unless it is the only
 * energy present (it also feeds cooling/appliances). Returns contract energy.
 */
function heatingEnergyFromLl84(row) {
  const gas = num(row.natural_gas_use_kbtu) ?? 0;
  const oil = (num(row.fuel_oil_2_use_kbtu) ?? 0) + (num(row.fuel_oil_4_use_kbtu) ?? 0) + (num(row.fuel_oil_5_6_use_kbtu) ?? 0);
  const steam = (num(row.district_steam_use_kbtu) ?? 0) + (num(row.district_hot_water_use_kbtu) ?? 0);
  const elec = num(row.electricity_use_grid_purchase) ?? 0;
  const thermal = { gaz_naturel: gas, fioul: oil, reseau_chaleur: steam };
  const entries = Object.entries(thermal).sort((a, b) => b[1] - a[1]);
  if (entries[0][1] <= 0) return { energy: elec > 0 ? 'electricite' : 'gaz_naturel', secondary: null };
  const total = gas + oil + steam;
  const secondary = entries[1][1] > 0.2 * total ? entries[1][0] : null;
  return { energy: entries[0][0], secondary };
}

/** MODELLED heating energy by era when no LL84 fuel mix exists. */
function heatingEnergyFromEra(year, bbl, floors) {
  const h = hash01(bbl);
  if (year < 1945) {
    // Pre-war: ConEd district steam common in larger buildings, else fuel oil.
    if (floors >= 6 && h < 0.5) return 'reseau_chaleur';
    return h < 0.7 ? 'fioul' : 'gaz_naturel';
  }
  if (year < 1975) return h < 0.45 ? 'fioul' : 'gaz_naturel'; // oil-to-gas conversions ongoing
  if (year < 2001) return h < 0.8 ? 'gaz_naturel' : 'electricite';
  return h < 0.7 ? 'gaz_naturel' : 'electricite';
}

function heatingKindFor(energy) {
  switch (energy) {
    case 'gaz_naturel': return 'chaudiere_gaz';
    case 'fioul': return 'chaudiere_fioul';
    case 'reseau_chaleur': return 'district_steam_coned'; // ConEd steam loop
    case 'electricite': return 'radiateurs_electriques';
    case 'pac': return 'pac_air_eau';
    default: return 'chaudiere_gaz';
  }
}

/** MODELLED cooling: AC penetration in NYC is very high post-1960. */
function coolingFor(year, floors, usage) {
  if (year >= 1960) {
    if (floors >= 6 || usage.startsWith('tertiary')) return 'climatisation_centralisee';
    return 'pac_air_air';
  }
  if (usage.startsWith('tertiary')) return 'climatisation_centralisee';
  return null; // pre-war residential: window units, not modelled as a system
}

// ---------------------------------------------------------------------------
// MODELLED summer comfort — NOT measured in any NYC source (see header).
// Shared model in scripts/comfort-model.mjs: per-city median base, modulated
// by inertia, glazing ratio, solar protection, era, urban heat island
// (distance to region centre), height and a deterministic per-building noise.
// Warming horizons x1.45 (2050) and x2.05 (2100), same factors as the FR pipeline.
// ---------------------------------------------------------------------------

/** Shoelace centroid of the largest polygon ring of a WGS84 MultiPolygon. */
function centroidOfMultiPolygon(geom) {
  if (!geom || geom.type !== 'MultiPolygon' || !geom.coordinates) return null;
  let best = null, bestArea = 0;
  for (const poly of geom.coordinates) {
    const ring = poly[0];
    if (!ring || ring.length < 4) continue;
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x0, y0] = ring[i];
      const [x1, y1] = ring[i + 1];
      const cross = x0 * y1 - x1 * y0;
      a += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross;
    }
    a /= 2;
    if (Math.abs(a) > bestArea) {
      bestArea = Math.abs(a);
      best = { lng: cx / (6 * a), lat: cy / (6 * a) };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();

  // Pass 1 — LL84 Manhattan (REAL measured energy). Latest report_year per BBL.
  console.log('Pass 1: LL84 (5zyy-y8am) Manhattan...');
  const ll84Rows = await fetchAll(LL84,
    '$select=' + encodeURIComponent([
      'nyc_borough_block_and_lot', 'report_year', 'address_1', 'postal_code',
      'primary_property_type_self', 'site_eui_kbtu_ft', 'total_location_based_ghg',
      'property_gfa_self_reported', 'year_built',
      'natural_gas_use_kbtu', 'fuel_oil_2_use_kbtu', 'fuel_oil_4_use_kbtu',
      'fuel_oil_5_6_use_kbtu', 'district_steam_use_kbtu', 'district_hot_water_use_kbtu',
      'electricity_use_grid_purchase',
    ].join(',')) +
    '&$where=' + encodeURIComponent("borough = 'MANHATTAN'"),
    'nyc_borough_block_and_lot');
  const ll84Map = new Map(); // bbl -> best row
  let euiOutliers = 0;
  for (const r of ll84Rows) {
    const bbl = normBbl(r.nyc_borough_block_and_lot);
    if (!bbl) continue;
    const eui = num(r.site_eui_kbtu_ft);
    // Plausibility filter: LL84 self-reported data contains known extreme
    // outliers (meter errors, data centers, mis-keyed areas). Site EUI for
    // NYC buildings realistically sits in ~3..600 kBtu/ft2-yr; outside that
    // band we treat the measurement as invalid and the building falls back
    // to the era-based ep model (flagged as estimated, see header).
    if (eui == null || eui < 3 || eui > 600) { if (eui != null) euiOutliers++; continue; }
    const year = num(r.report_year) ?? 0;
    const prev = ll84Map.get(bbl);
    if (!prev || year > prev.reportYear) ll84Map.set(bbl, { ...r, reportYear: year });
  }
  console.log(`Pass 1: ${ll84Rows.length} LL84 rows -> ${ll84Map.size} unique BBLs with a valid Site EUI (${euiOutliers} outlier rows rejected, EUI outside 3..600 kBtu/ft2)`);

  // Pass 2 — PLUTO Manhattan.
  console.log('Pass 2: PLUTO (64uk-42ks) Manhattan...');
  const plutoRows = await fetchAll(PLUTO,
    '$select=' + encodeURIComponent([
      'bbl', 'address', 'zipcode', 'yearbuilt', 'numfloors', 'unitsres',
      'unitstotal', 'bldgarea', 'lotarea', 'landuse', 'bldgclass', 'latitude', 'longitude',
    ].join(',')) +
    '&borough=MN&$where=' + encodeURIComponent('latitude IS NOT NULL'),
    'bbl');
  const plutoMap = new Map();
  for (const r of plutoRows) {
    const bbl = normBbl(r.bbl);
    if (bbl) plutoMap.set(bbl, r);
  }
  console.log(`Pass 2: ${plutoRows.length} PLUTO rows -> ${plutoMap.size} unique BBLs`);

  // Pass 3 — DoITT footprints, Manhattan (no geometry yet: attributes only).
  console.log('Pass 3: DoITT footprints (5zhs-2jue) Manhattan, attributes...');
  const fpRows = await fetchAll(FOOTPRINTS,
    '$select=' + encodeURIComponent('mappluto_bbl,bin,shape_area,construction_year,height_roof') +
    '&$where=' + encodeURIComponent("mappluto_bbl like '1%' AND bin IS NOT NULL"),
    'objectid');
  const fpMap = new Map(); // bbl -> largest footprint
  for (const r of fpRows) {
    const bbl = normBbl(r.mappluto_bbl);
    if (!bbl) continue;
    const area = num(r.shape_area) ?? 0;
    if (area <= 0) continue;
    const prev = fpMap.get(bbl);
    if (!prev || area > (num(prev.shape_area) ?? 0)) fpMap.set(bbl, r);
  }
  console.log(`Pass 3: ${fpRows.length} footprints -> ${fpMap.size} unique BBLs (largest footprint kept)`);

  // Pass 4 — build candidate list (join footprints x PLUTO x LL84).
  console.log('Pass 4: joining...');
  const candidates = [];
  let droppedNoCoord = 0, droppedUse = 0, droppedBbox = 0;
  const allBbls = new Set([...fpMap.keys()]);
  for (const bbl of plutoMap.keys()) allBbls.add(bbl);

  for (const bbl of allBbls) {
    const fp = fpMap.get(bbl) ?? null;
    const pl = plutoMap.get(bbl) ?? null;
    const ll = ll84Map.get(bbl) ?? null;

    // Usage (LL84 property type wins, else PLUTO landuse/class). Drop parking etc.
    const unitsRes = Math.max(0, Math.round(num(pl?.unitsres) ?? 0));
    const unitsTotal = Math.max(0, Math.round(num(pl?.unitstotal) ?? unitsRes));
    let usage = ll ? mapUsageFromLl84(ll.primary_property_type_self, unitsRes) : null;
    if (usage == null) usage = mapUsageFromLanduse(pl?.landuse, unitsRes, unitsTotal, pl?.bldgclass);
    if (usage == null) { droppedUse++; continue; }

    // Construction year: real footprint year > LL84 > PLUTO; sanity-clamped.
    let year = num(fp?.construction_year);
    if (!(year > 1600 && year <= 2026)) year = num(ll?.year_built);
    if (!(year > 1600 && year <= 2026)) year = num(pl?.yearbuilt);
    if (!(year > 1600 && year <= 2026)) year = 1930; // unknown -> Manhattan median stock
    year = Math.round(year);

    // Areas (real): footprint shape_area (ft2) -> m2; gross floor area from
    // PLUTO bldgarea or LL84 self-reported GFA.
    const lotAreaM2 = (num(pl?.lotarea) ?? 0) * FT2_TO_M2;
    const footprintM2 = fp ? (num(fp.shape_area) ?? 0) * FT2_TO_M2 : lotAreaM2;
    const grossFt2 = num(ll?.property_gfa_self_reported) ?? num(pl?.bldgarea) ?? 0;
    if (footprintM2 <= 0 && grossFt2 <= 0) { droppedNoCoord++; continue; }

    // Height (real from footprints) / floors (real from PLUTO).
    let heightM = fp ? (num(fp.height_roof) ?? 0) * FT_TO_M : 0;
    if (heightM > 0 && heightM < 2.5) heightM = 0; // implausible roof height -> fall back to floors x 3
    let floors = Math.round(num(pl?.numfloors) ?? 0);
    if (floors < 1 && heightM > 0) floors = Math.max(1, Math.round(heightM / 3));
    if (floors < 1) floors = 1;
    if (!(heightM > 0)) heightM = floors * 3;

    // Coordinates: PLUTO lot centroid for now; footprint geometry refined in pass 6.
    let lat = num(pl?.latitude);
    let lng = num(pl?.longitude);
    if (lat == null || lng == null) { droppedNoCoord++; continue; }
    if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) { droppedBbox++; continue; }

    candidates.push({
      bbl, fp, pl, ll, usage, year,
      footprintM2, grossFt2, floors, heightM, unitsRes, unitsTotal,
      lat, lng,
      zip: (pl?.zipcode ?? ll?.postal_code ?? '').trim(),
      grossM2: grossFt2 * FT2_TO_M2,
    });
  }
  console.log(`Pass 4: ${candidates.length} candidates ` +
    `(dropped: ${droppedUse} non-building use, ${droppedNoCoord} missing area/coords, ${droppedBbox} outside Manhattan bbox)`);

  // Pass 5 — deterministic selection: per-zip quota (largest remainder),
  // LL84-matched first (max 80% of the zip quota), then larger buildings.
  console.log('Pass 5: selecting...');
  const byZip = new Map();
  for (const c of candidates) {
    const z = c.zip || 'unknown';
    if (!byZip.has(z)) byZip.set(z, []);
    byZip.get(z).push(c);
  }
  const quotas = new Map();
  {
    const entries = [...byZip.entries()].map(([zip, list]) => {
      const exact = (CAP * list.length) / candidates.length;
      return { zip, exact, floor: Math.max(1, Math.floor(exact)) };
    });
    let sum = entries.reduce((s, e) => s + e.floor, 0);
    entries.sort((a, b) => (b.exact - b.floor) - (a.exact - a.floor));
    for (let i = 0; sum < CAP; i = (i + 1) % entries.length) { entries[i].floor++; sum++; }
    for (const e of entries) quotas.set(e.zip, e.floor);
  }
  const selected = [];
  for (const [zip, list] of byZip.entries()) {
    const q = quotas.get(zip) ?? 0;
    const withLl = list.filter((c) => c.ll).sort((a, b) => b.grossM2 - a.grossM2 || hash01(a.bbl) - hash01(b.bbl));
    const without = list.filter((c) => !c.ll).sort((a, b) => b.grossM2 - a.grossM2 || hash01(a.bbl) - hash01(b.bbl));
    const takeLl = Math.min(withLl.length, Math.ceil(0.8 * q));
    selected.push(...withLl.slice(0, takeLl));
    const rest = q - takeLl;
    selected.push(...without.slice(0, rest));
    // shortfall (zip had too few non-LL84): top up with remaining LL84
    const deficit = q - takeLl - Math.min(rest, without.length);
    if (deficit > 0) selected.push(...withLl.slice(takeLl, takeLl + deficit));
    void rand; // rand reserved for tie-breaks; hash01 already deterministic
  }
  console.log(`Pass 5: ${selected.length} selected (cap ${CAP}) across ${byZip.size} zipcodes`);

  // Pass 6 — footprint geometry for the selected buildings (real centroids),
  // fetched in batches by BIN. Fallback: PLUTO lot centroid (already stored).
  console.log('Pass 6: footprint geometry for selected buildings...');
  const bins = selected.filter((c) => c.fp?.bin).map((c) => c.fp.bin);
  const geomByBin = new Map();
  const BATCH = 60;
  for (let i = 0; i < bins.length; i += BATCH) {
    const chunk = bins.slice(i, i + BATCH);
    const where = `bin in(${chunk.map((b) => `'${b}'`).join(',')})`;
    const rows = await fetchJson(`${FOOTPRINTS}?$select=${encodeURIComponent('bin,the_geom')}&$where=${encodeURIComponent(where)}&$limit=${BATCH * 4}`);
    for (const r of rows) geomByBin.set(String(r.bin), r.the_geom);
    if ((i / BATCH) % 20 === 0) process.stdout.write(`\r  geometry batches ${i / BATCH + 1}/${Math.ceil(bins.length / BATCH)}`);
    await sleep(120);
  }
  process.stdout.write('\n');
  let geomHits = 0;
  for (const c of selected) {
    const g = c.fp?.bin ? geomByBin.get(String(c.fp.bin)) : null;
    const cen = g ? centroidOfMultiPolygon(g) : null;
    if (cen && cen.lat >= LAT_MIN && cen.lat <= LAT_MAX && cen.lng >= LNG_MIN && cen.lng <= LNG_MAX) {
      c.lat = cen.lat; c.lng = cen.lng; geomHits++;
    }
  }
  console.log(`Pass 6: real footprint centroids for ${geomHits}/${selected.length} buildings (rest: PLUTO lot centroid)`);

  // Pass 7 — emit Building-contract objects.
  console.log('Pass 7: emitting...');
  const buildings = selected.map((c, i) => {
    const era = eraDefaultsNyc(c.year);
    const ll = c.ll;

    // Living area: real gross floor area -> net (85% residential / 90% tertiary).
    const netFactor = c.usage.startsWith('residential') ? 0.85 : 0.9;
    const livingArea = Math.round(
      (c.grossM2 > 0 ? c.grossM2 * netFactor : c.footprintM2 * c.floors * 0.8 * netFactor),
    );
    const housingUnits = c.unitsRes > 0 ? c.unitsRes
      : c.usage === 'residential_individual' ? 1
      : c.usage === 'residential_collective' ? Math.max(1, Math.round(livingArea / 75))
      : 0;

    // Systems: LL84 fuel mix is REAL; era model otherwise (see header).
    let heatEnergy, heatSecondary = null, heatingReal = false;
    if (ll) {
      const h = heatingEnergyFromLl84(ll);
      heatEnergy = h.energy; heatSecondary = h.secondary; heatingReal = true;
    } else {
      heatEnergy = heatingEnergyFromEra(c.year, c.bbl, c.floors);
    }
    const sysAge = ll ? 12 : c.year < 1960 ? 25 : c.year < 2000 ? 15 : 8;
    const heating = { kind: heatingKindFor(heatEnergy), energy: heatEnergy, ageYears: sysAge };
    const heatingSecondary = heatSecondary
      ? { kind: heatingKindFor(heatSecondary), energy: heatSecondary, ageYears: sysAge + 5 }
      : null;
    const dhw = {
      kind: heatEnergy === 'electricite' ? 'chauffe_eau_electrique' : 'chaudiere',
      energy: heatEnergy,
      ageYears: 10,
    };
    const cooling = coolingFor(c.year, c.floors, c.usage);
    const ventilation = c.year >= 1990 ? 'vmc_simple_flux' : 'naturelle';

    // Certificate: REAL LL84 measurement when present, else era estimate.
    let ep, ges, energyReal = false;
    if (ll) {
      const eui = num(ll.site_eui_kbtu_ft);
      ep = eui * KBTU_FT2_TO_KWH_M2;
      const ghgT = num(ll.total_location_based_ghg);
      const gfaM2 = (num(ll.property_gfa_self_reported) ?? 0) * FT2_TO_M2;
      if (ghgT != null && gfaM2 > 0) {
        ges = (ghgT * 1000) / gfaM2;
        // Plausibility filter: beyond 300 kgCO2/m2-yr the LL84 self-reported
        // GHG/GFA pair is inconsistent (meter or area error) -> fuel-factor estimate.
        if (!(ges > 0 && ges <= 300)) ges = ep * GES_FACTOR[heatEnergy];
      } else ges = ep * GES_FACTOR[heatEnergy];
      energyReal = true;
    } else {
      ep = era.ep;
      // blended factor: ~70% of site energy on the heating fuel, ~30% on grid electricity
      ges = ep * (0.7 * GES_FACTOR[heatEnergy] + 0.3 * GES_FACTOR.electricite);
    }
    ep = Math.round(ep * 10) / 10;
    ges = Math.round(ges * 10) / 10;
    const label = labelFromEp(ep);
    const gesLabel = labelFromGes(ges);

    // Envelope: MODELLED era defaults (no per-building source), wall material
    // from the era table with a deterministic brownstone variation pre-1945.
    let wallMaterial = era.wall;
    if (c.year < 1945 && c.floors <= 5 && hash01(c.bbl + 'w') < 0.3) wallMaterial = 'pierre'; // brownstone rowhouses
    const glazingRatio = c.year < 1930 ? 0.15 : c.year < 1981 ? 0.25 : c.year < 2001 ? 0.35 : 0.4;

    const address = ((c.pl?.address ?? ll?.address_1 ?? 'Address not referenced').trim()) + ' New York NY';
    const annualConsumption = Math.round(ep * livingArea);

    return {
      id: `nyc-${String(i + 1).padStart(5, '0')}`,
      nationalDbId: c.bbl,
      registryId: '',
      address,
      city: 'New York',
      postcode: c.zip === 'unknown' ? '' : c.zip,
      department: 'New York County (Manhattan)',
      lat: Math.round(c.lat * 1e6) / 1e6,
      lng: Math.round(c.lng * 1e6) / 1e6,
      usage: c.usage,
      constructionYear: c.year,
      footprintAreaM2: Math.round(c.footprintM2),
      floors: c.floors,
      heightM: Math.round(c.heightM * 10) / 10,
      livingAreaM2: livingArea,
      housingUnits,
      envelope: {
        wallMaterial,
        wallInsulation: era.insul,
        uWall: era.uWall,
        roofType: 'terrasse', // NYC flat roofs
        uRoof: era.uRoof,
        uFloor: era.uFloor,
        glazingRatio,
        glazingType: era.glazing,
        solarProtection: false, // external shading rare in NYC
        inertia: era.inertia,
      },
      systems: {
        heating,
        heatingSecondary,
        dhw,
        cooling,
        ventilation,
        hasCeilingFans: false,
        pvSurfaceM2: 0,
      },
      certificate: { label, ep, ges, gesLabel },
      comfort: null, // shared model applied below (needs id + full stock for base calibration)
      annualConsumptionKwhEp: annualConsumption,
      annualGesKgCo2: Math.round(ges * livingArea),
      // $0.15/kWh documented NYC blended energy price; field holds USD on the US branch.
      annualEnergyCostEur: Math.round(annualConsumption * 0.18),
      _energyReal: energyReal, // stripped before write; used for the summary
      _heatingReal: heatingReal,
    };
  });

  // Shared comfort model: first pass with the default base, calibrate the base
  // to the median of the modelled stock, then recompute deterministically.
  for (const b of buildings) b.comfort = computeComfort(b, 'us');
  calibrateBase('us', buildings);
  for (const b of buildings) b.comfort = computeComfort(b, 'us');

  // Final validation: 0 entries outside the Manhattan bbox.
  const outOfBounds = buildings.filter(
    (b) => b.lat < LAT_MIN || b.lat > LAT_MAX || b.lng < LNG_MIN || b.lng > LNG_MAX,
  );
  if (outOfBounds.length > 0) {
    console.error(`FATAL: ${outOfBounds.length} buildings outside Manhattan bbox, e.g.`, outOfBounds[0]);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  const stats = {
    total: buildings.length,
    withRealEnergy: buildings.filter((b) => b._energyReal).length,
    withRealHeating: buildings.filter((b) => b._heatingReal).length,
  };
  for (const b of buildings) { delete b._energyReal; delete b._heatingReal; }
  fs.writeFileSync(OUT_FILE, JSON.stringify(buildings));
  // Verify the file parses.
  const parsed = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  if (parsed.length !== buildings.length) {
    console.error('FATAL: written JSON does not round-trip');
    process.exit(1);
  }

  // Summary.
  const perLabel = Object.fromEntries(LABELS.map((l) => [l, 0]));
  const perUsage = {};
  const perZip = new Map();
  for (const b of buildings) {
    perLabel[b.certificate.label]++;
    perUsage[b.usage] = (perUsage[b.usage] ?? 0) + 1;
    perZip.set(b.postcode, (perZip.get(b.postcode) ?? 0) + 1);
  }
  console.log('\n=== NYC INGEST SUMMARY ===');
  console.log(`LL84 rows parsed        : ${ll84Rows.length} (${ll84Map.size} unique BBLs with valid Site EUI)`);
  console.log(`PLUTO rows parsed       : ${plutoRows.length}`);
  console.log(`Footprints parsed       : ${fpRows.length} (${fpMap.size} unique BBLs)`);
  console.log(`Candidates after join   : ${candidates.length}`);
  console.log(`Kept (cap ${CAP})         : ${buildings.length}`);
  console.log(`With REAL LL84 energy   : ${stats.withRealEnergy} (${((stats.withRealEnergy / buildings.length) * 100).toFixed(1)}%)`);
  console.log(`With REAL LL84 fuel mix : ${stats.withRealHeating} (${((stats.withRealHeating / buildings.length) * 100).toFixed(1)}%)`);
  console.log(`Real footprint centroids: ${geomHits}`);
  console.log('Label distribution      :', perLabel);
  console.log('Usage distribution      :', perUsage);
  console.log('Top 10 zipcodes         :');
  [...perZip.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    .forEach(([z, n]) => console.log(`  ${z}: ${n}`));
  console.log('Sample addresses        :');
  for (const b of [buildings[0], buildings[Math.floor(buildings.length / 4)], buildings[Math.floor(buildings.length / 2)], buildings[Math.floor((3 * buildings.length) / 4)], buildings[buildings.length - 1]]) {
    console.log(`  ${b.address} (${b.postcode}) — ${b.constructionYear}, ${b.floors} floors, ${b.certificate.label}`);
  }
  console.log(`Written: ${OUT_FILE} (${(fs.statSync(OUT_FILE).size / 1e6).toFixed(1)} MB)`);
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((err) => { console.error(err); process.exit(1); });
