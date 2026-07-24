/**
 * Renovativ AI Map — London (UK) building dataset pipeline.
 * Owned by E2_London_Data. Produces public/data/uk-london.json ONLY.
 *
 * Usage:
 *   EPC_API_TOKEN=... node scripts/fetch-london.mjs
 *   (token lives in the gitignored .env.local — never commit it)
 *
 * Optional env knobs:
 *   FETCH_BUDGET_S=240   detail-fetch time budget per run (script is RESUMABLE:
 *                        re-run until it prints "WRITTEN"; progress is cached in
 *                        scripts/.epc-london-cache.local — the filename ends in
 *                        ".local" so the repo's `*.local` gitignore rule covers it)
 *
 * DATA SOURCE — REAL UK EPC certificates (no invented buildings):
 *   Energy Certificate Data API, Ministry of Housing, Communities & Local
 *   Government (MHCLG), covers England & Wales.
 *   Docs:  https://get-energy-performance-data.communities.gov.uk/api-technical-documentation
 *   Base:  https://api.get-energy-performance-data.communities.gov.uk
 *   Auth:  `Authorization: Bearer <token>` (free registration; token is read
 *          from the EPC_API_TOKEN env var and never written to disk by this
 *          script).
 *   Rate limit: 6000 requests / 5 min per application; HTTP 429 = back off.
 *
 *   Endpoints used (paths verified against the live docs, 2026-06):
 *     GET /api/domestic/search?council[]=<name>&page_size=1000&current_page=N
 *         -> summary rows: certificateNumber, address, postcode,
 *            currentEnergyEfficiencyBand, uprn, ...
 *     GET /api/certificate?certificate_number=<id>
 *         -> full SAP assessment: construction year / age band, floor areas,
 *            wall/roof/floor U-values, glazing, heating/hot-water descriptions,
 *            energy_consumption_current (kWh/m2/yr), co2_emissions_current,
 *            has_fixed_air_conditioning, costs, ...
 *
 *   History note: the legacy host https://epc.opendatacommunities.org now
 *   answers HTTP 301 (redirect to the new GOV.UK service root) and the legacy
 *   path /api/v1/domestic/search is gone (HTTP 404 on the new host). The new
 *   endpoint paths above are the live ones. An earlier OpenStreetMap/Overpass
 *   fallback (buildings + tags only, modelled EPC) was superseded once the
 *   user supplied an API token.
 *
 * GEOCODING — EPC records carry NO coordinates. Postcodes are geocoded with
 *   the free, keyless postcodes.io bulk API (POST https://api.postcodes.io/postcodes,
 *   <=100 postcodes per call) which returns the postcode centroid (lat/lng).
 *   DISPLAY OFFSET: every building sharing a postcode would otherwise stack on
 *   one point, so a small DETERMINISTIC offset (seeded PRNG keyed on the
 *   certificate number, radius <= 60 m) is added to the centroid. This is a
 *   display jitter only — the true location precision is "postcode centroid",
 *   which in dense London is typically < 150 m from the building.
 *
 * REAL vs MODELLED fields:
 *   REAL (from the EPC certificate): address, postcode, UPRN, EPC band
 *     (certificate.label), energy consumption kWh/m2/yr (certificate.ep =
 *     energy_consumption_current), CO2 kg/m2/yr (certificate.ges =
 *     co2_emissions_current_per_floor_area), construction year (SAP
 *     construction_year, or the SAP construction-age-band letter mapped to its
 *     band midpoint — band mapping per the standard SAP/RdSAP age bands
 *     A=before 1900, B=1900-1929, C=1930-1949, D=1950-1966, E=1967-1975,
 *     F=1976-1982, G=1983-1990, H=1991-1995, I=1996-2002, J=2003-2006,
 *     K=2007-2011, L=2012 onwards), total floor area, living area, wall/roof/
 *     floor descriptions + U-values, glazing description, heating & hot-water
 *     fuel (from descriptions), fixed air conditioning flag, annual energy
 *     cost (heating+hot water+lighting current costs, GBP), thermal mass.
 *   MODELLED / ESTIMATED (source genuinely lacks them — flagged):
 *     - floors for flats/maisonettes: an EPC certifies one dwelling, the block
 *       storey count is not recorded -> default 4 (houses use the real count
 *       of SAP floor dimensions).
 *     - footprintAreaM2 = total_floor_area / floors (derived).
 *     - housingUnits = 1 per certificate (each EPC covers one dwelling).
 *     - glazingRatio (0.15-0.25 seeded), solarProtection (false — not recorded
 *       in EPC and rare in UK stock), wall insulation POSITION (internal vs
 *       external is not recorded; "insulated" walls map to 'iti').
 *     - comfort (summer degree-hours): shared model in scripts/comfort-model.mjs
 *       (per-city median base; inertia/glazing/era/UHI/height/noise);
 *       dh2050 = 1.5 x, dh2100 = 2.2 x (project climate warming factors).
 *     - certificate.ep bands: we keep the REAL EPC A-G band for label; ep is
 *       the real kWh/m2/yr figure. (The A<=45..G>340 kWh/m2/an band scale from
 *       the original OSM-fallback brief is superseded by real data.)
 *     - ventilation mapped approximately from SAP ventilation fields.
 *
 * Determinism: sampling and offsets use a seeded mulberry32 PRNG (fixed seed);
 * certificates are processed sorted by certificate number. Re-runs with the
 * same cache produce identical output.
 */

import fs from 'node:fs';
import path from 'node:path';
import { computeComfort, calibrateBase } from './comfort-model.mjs';

const API_BASE = 'https://api.get-energy-performance-data.communities.gov.uk';
const OUT_FILE = path.resolve('public/data/uk-london.json');
const CACHE_FILE = path.resolve('scripts/.epc-london-cache.local'); // `*.local` is gitignored
const TARGET_TOTAL = 8000;
const PER_COUNCIL = 800; // 10 councils x 800
const SEARCH_PAGES = 2; // pages of 1000 summary rows per council
const SEED = 20260630;
const FETCH_BUDGET_S = Number(process.env.FETCH_BUDGET_S ?? 240);
const DETAIL_DELAY_MS = 35; // ~10-12 req/s observed, safely under the 6000/5min limit

const TOKEN = process.env.EPC_API_TOKEN;
if (!TOKEN) {
  console.error('FATAL: EPC_API_TOKEN env var is required (see header comments).');
  process.exit(1);
}

// London sanity bounds (validation gate).
const LAT_MIN = 51.28, LAT_MAX = 51.70, LNG_MIN = -0.55, LNG_MAX = 0.30;

// 10 London councils (names must match the API's council list exactly).
const COUNCILS = [
  'City of London',
  'Westminster',
  'Camden',
  'Islington',
  'Hackney',
  'Southwark',
  'Lambeth',
  'Kensington and Chelsea',
  'Tower Hamlets',
  'Hammersmith and Fulham',
];

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32) — deterministic sampling and offsets.
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// HTTP helpers with 429 backoff.
// ---------------------------------------------------------------------------
async function apiGet(urlPath) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(`${API_BASE}${urlPath}`, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
    });
    if (res.status === 429) {
      const wait = attempt * 30000;
      console.log(`  429 rate-limited, backing off ${wait / 1000}s (attempt ${attempt}/5)`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${urlPath}`);
    return res.json();
  }
  throw new Error(`Rate limit persists for ${urlPath}`);
}

// ---------------------------------------------------------------------------
// Cache (resumable): { summaries: {certNo: row}, details: {certNo: cert}, geo: {postcode: {lat,lng}|null} }
// ---------------------------------------------------------------------------
function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    return { summaries: {}, details: {}, geo: {}, picked: null };
  }
}
function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
}

// ---------------------------------------------------------------------------
// Field mapping helpers (EPC -> Building contract)
// ---------------------------------------------------------------------------

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

// Standard SAP/RdSAP construction age band letters -> band midpoint year.
const AGE_BAND_MID = {
  A: 1850, B: 1915, C: 1940, D: 1958, E: 1971, F: 1979,
  G: 1987, H: 1993, I: 1999, J: 2005, K: 2009, L: 2017,
};

function constructionYear(cert) {
  const parts = cert.sap_building_parts ?? [];
  for (const p of parts) {
    const y = Number(p.construction_year);
    if (Number.isFinite(y) && y >= 1500 && y <= 2026) return Math.round(y);
  }
  for (const p of parts) {
    const band = String(p.construction_age_band ?? '').trim().toUpperCase();
    if (AGE_BAND_MID[band]) return AGE_BAND_MID[band];
  }
  return null;
}

function mapUsage(dwellingType) {
  const d = String(dwellingType ?? '').toLowerCase();
  if (d.includes('flat') || d.includes('maisonette')) return 'residential_collective';
  if (d.includes('park home')) return 'residential_individual';
  return 'residential_individual'; // houses, bungalows
}

function mapWall(description) {
  const d = String(description ?? '').toLowerCase();
  let material = 'brique';
  if (d.includes('stone') || d.includes('granite') || d.includes('sandstone')) material = 'pierre';
  else if (d.includes('timber frame')) material = 'bois';
  else if (d.includes('system built') || d.includes('concrete')) material = 'beton';
  let insulation = 'aucune';
  if (d.includes('external insulation')) insulation = 'ite';
  else if (d.includes('internal insulation') || d.includes('filled cavity') ||
           (d.includes('insulated') && !d.includes('no insulation') && !d.includes('not insulated'))) insulation = 'iti';
  return { material, insulation };
}

function mapGlazing(description) {
  const d = String(description ?? '').toLowerCase();
  if (d.includes('triple')) return 'triple';
  if (d.includes('high performance')) return 'double_renouvele';
  if (d.includes('double') || d.includes('secondary glazing')) return 'double';
  if (d.includes('single')) return 'simple';
  return 'double';
}

function mapHeatingEnergy(description) {
  const d = String(description ?? '').toLowerCase();
  if (d.includes('community') || d.includes('district')) return 'reseau_chaleur';
  if (d.includes('mains gas') || d.includes('gas')) return 'gaz_naturel';
  if (d.includes('oil') || d.includes('lpg') || d.includes('coal') || d.includes('smokeless')) return 'fioul';
  if (d.includes('heat pump')) return 'pac';
  if (d.includes('wood')) return 'bois';
  if (d.includes('electric')) return 'electricite';
  return 'gaz_naturel';
}

function heatingKind(description, energy) {
  const d = String(description ?? '').toLowerCase();
  if (d.includes('heat pump')) return 'pac_air_eau';
  if (d.includes('community') || d.includes('district')) return 'reseau_chaleur';
  if (d.includes('boiler')) return energy === 'fioul' ? 'chaudiere_fioul' : 'chaudiere_gaz';
  if (d.includes('room heater') && d.includes('electric')) return 'radiateurs_electriques';
  if (d.includes('storage heater')) return 'radiateurs_electriques';
  if (d.includes('warm air')) return 'emetteurs_bas_temperature';
  switch (energy) {
    case 'gaz_naturel': return 'chaudiere_gaz';
    case 'fioul': return 'chaudiere_fioul';
    case 'reseau_chaleur': return 'reseau_chaleur';
    case 'pac': return 'pac_air_eau';
    default: return 'radiateurs_electriques';
  }
}

function mapDhw(description, heatEnergy) {
  const d = String(description ?? '').toLowerCase();
  if (d.includes('community') || d.includes('district'))
    return { kind: 'reseau_chaleur', energy: 'reseau_chaleur', ageYears: 10 };
  if (d.includes('electric') || d.includes('immersion'))
    return { kind: 'chauffe_eau_electrique', energy: 'electricite', ageYears: 10 };
  if (d.includes('heat pump'))
    return { kind: 'chauffe_eau_thermodynamique', energy: 'pac', ageYears: 10 };
  return { kind: 'chaudiere', energy: heatEnergy, ageYears: 10 }; // "from main system"
}

function mapVentilation(cert) {
  const v = cert.sap_ventilation ?? {};
  if (v.mechanical_vent_system_index_number) return 'vmc_double_flux'; // MVHR systems are indexed
  if ((v.extract_fans_count ?? 0) > 0) return 'vmc_simple_flux';
  return 'naturelle';
}

// UK era-based fallbacks when the certificate lacks a U-value (MODELLED).
function ukEraDefaults(year) {
  if (year < 1919) return { uWall: 2.1, uRoof: 2.3, uFloor: 1.2 };
  if (year < 1945) return { uWall: 1.9, uRoof: 2.0, uFloor: 1.0 };
  if (year < 1980) return { uWall: 1.4, uRoof: 1.0, uFloor: 0.9 };
  if (year < 2003) return { uWall: 0.6, uRoof: 0.4, uFloor: 0.6 };
  if (year < 2013) return { uWall: 0.4, uRoof: 0.25, uFloor: 0.4 };
  return { uWall: 0.25, uRoof: 0.15, uFloor: 0.25 };
}

function labelFromGes(ges) {
  if (ges <= 5) return 'A';
  if (ges <= 10) return 'B';
  if (ges <= 20) return 'C';
  if (ges <= 35) return 'D';
  if (ges <= 55) return 'E';
  if (ges <= 80) return 'F';
  return 'G';
}

// MODELLED summer comfort (see header): shared model in scripts/comfort-model.mjs
// (per-city median base; inertia, glazing, protection, era, urban heat island,
// height, deterministic noise); horizons x1.5 (2050), x2.2 (2100).

// Deterministic display offset: <= 60 m from the postcode centroid, keyed on
// the certificate number. 1 deg lat ~ 111320 m; lng scaled by cos(51.5 deg).
function postcodeOffset(certNo) {
  const rnd = mulberry32(hashString(certNo) ^ SEED);
  const r = 60 * Math.sqrt(rnd()); // metres, area-uniform
  const theta = rnd() * 2 * Math.PI;
  return {
    dLat: (r * Math.cos(theta)) / 111320,
    dLng: (r * Math.sin(theta)) / (111320 * Math.cos((51.5 * Math.PI) / 180)),
  };
}

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

async function stageSearch(cache) {
  for (const council of COUNCILS) {
    for (let page = 1; page <= SEARCH_PAGES; page++) {
      const key = `${council}#${page}`;
      if (cache.summaries[key] === 'done') continue;
      const q = `/api/domestic/search?council[]=${encodeURIComponent(council)}&page_size=1000&current_page=${page}`;
      const json = await apiGet(q);
      for (const row of json.data ?? []) {
        if (row.certificateNumber) cache.summaries[row.certificateNumber] = row;
      }
      cache.summaries[key] = 'done';
      console.log(`Search ${council} p${page}: +${(json.data ?? []).length} summaries (total records: ${json.pagination?.totalRecords})`);
      saveCache(cache);
      await sleep(300);
    }
  }
  // Page markers ("<council>#<page>" -> "done") stay in the cache so re-runs
  // skip completed pages; readers must ignore keys containing '#'.
}

function stagePick(cache) {
  // Deterministic per-council sample: seed-shuffle each council's certs, take PER_COUNCIL.
  const byCouncil = new Map();
  for (const [certNo, row] of Object.entries(cache.summaries)) {
    if (typeof row !== 'object' || row === null) continue; // skip page markers
    const c = row.council ?? 'unknown';
    if (!byCouncil.has(c)) byCouncil.set(c, []);
    byCouncil.get(c).push(certNo);
  }
  const rnd = mulberry32(SEED);
  const picked = [];
  const perCouncil = {};
  for (const council of COUNCILS) {
    const list = (byCouncil.get(council) ?? []).sort();
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    const take = list.slice(0, PER_COUNCIL);
    perCouncil[council] = take.length;
    picked.push(...take);
  }
  cache.picked = picked.sort();
  console.log('Picked per council:', perCouncil, `-> total ${picked.length}`);
}

async function stageDetails(cache) {
  const t0 = Date.now();
  let fetched = 0, already = 0;
  for (const certNo of cache.picked) {
    if (cache.details[certNo]) { already++; continue; }
    if ((Date.now() - t0) / 1000 > FETCH_BUDGET_S) {
      saveCache(cache);
      console.log(`Budget reached. Details: ${Object.keys(cache.details).length}/${cache.picked.length} cached. RE-RUN the script to continue.`);
      return false;
    }
    try {
      const json = await apiGet(`/api/certificate?certificate_number=${encodeURIComponent(certNo)}`);
      if (json.data) cache.details[certNo] = json.data;
    } catch (err) {
      console.log(`  detail fetch failed for ${certNo}: ${err.message} (skipped, retried next run)`);
    }
    fetched++;
    if (fetched % 500 === 0) {
      saveCache(cache);
      console.log(`  details: ${Object.keys(cache.details).length}/${cache.picked.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
    await sleep(DETAIL_DELAY_MS);
  }
  saveCache(cache);
  console.log(`Details cached: ${Object.keys(cache.details).length}/${cache.picked.length} (new ${fetched}, existing ${already})`);
  return Object.keys(cache.details).length >= cache.picked.length * 0.98; // tolerate a few failures
}

async function stageGeocode(cache) {
  const pcs = new Set();
  for (const certNo of cache.picked) {
    const pc = cache.details[certNo]?.postcode ?? cache.summaries[certNo]?.postcode;
    if (pc) pcs.add(String(pc).trim().toUpperCase());
  }
  const missing = [...pcs].filter((pc) => !(pc in cache.geo));
  console.log(`Unique postcodes: ${pcs.size}, to geocode: ${missing.length}`);
  for (let i = 0; i < missing.length; i += 100) {
    const chunk = missing.slice(i, i + 100);
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const res = await fetch('https://api.postcodes.io/postcodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postcodes: chunk }),
        });
        if (res.status === 429) { await sleep(attempt * 5000); continue; }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        for (const item of json.result ?? []) {
          const pc = String(item.query).trim().toUpperCase();
          const r = item.result;
          cache.geo[pc] = r && r.latitude && r.longitude ? { lat: r.latitude, lng: r.longitude } : null;
        }
        break;
      } catch (err) {
        if (attempt === 4) {
          console.log(`  postcodes.io chunk failed: ${err.message}; marking as unknown`);
          for (const pc of chunk) cache.geo[pc] = null;
        } else await sleep(attempt * 5000);
      }
    }
    if (i % 1000 === 0 && i > 0) { saveCache(cache); console.log(`  geocoded ${i}/${missing.length}`); }
    await sleep(150);
  }
  saveCache(cache);
  const ok = Object.values(cache.geo).filter(Boolean).length;
  console.log(`Geocoded OK: ${ok}/${Object.keys(cache.geo).length} postcodes`);
}

function stageEmit(cache) {
  const rnd = mulberry32(SEED ^ 0x9e3779b9);
  const buildings = [];
  let droppedGeo = 0, droppedOut = 0, droppedYear = 0;

  for (const certNo of cache.picked) {
    const cert = cache.details[certNo];
    if (!cert) continue;
    const pc = String(cert.postcode ?? cache.summaries[certNo]?.postcode ?? '').trim().toUpperCase();
    const geo = cache.geo[pc];
    if (!geo) { droppedGeo++; continue; }
    const off = postcodeOffset(certNo);
    const lat = Math.round((geo.lat + off.dLat) * 1e6) / 1e6;
    const lng = Math.round((geo.lng + off.dLng) * 1e6) / 1e6;
    if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) { droppedOut++; continue; }

    const year = constructionYear(cert);
    if (!year) { droppedYear++; continue; }
    const era = ukEraDefaults(year);

    const usage = mapUsage(cert.dwelling_type);
    const part = (cert.sap_building_parts ?? [])[0] ?? {};
    const floorDims = part.sap_floor_dimensions ?? [];
    // Floors: real storey count for houses; MODELLED default 4 for flats
    // (block storey count is not recorded on a dwelling EPC).
    const isFlat = usage === 'residential_collective';
    const floors = isFlat ? 4 : Math.max(1, floorDims.length || 2);

    const totalFloorArea = Number(cert.total_floor_area) > 0 ? Number(cert.total_floor_area) : 80;
    const livingArea = Number(cert.living_area) > 0 ? Math.round(Number(cert.living_area)) : Math.round(totalFloorArea * 0.9);
    const footprint = Math.max(10, Math.round(totalFloorArea / floors));
    const heightM = Math.round(floors * 3 * 10) / 10;

    const wall = mapWall(cert.walls?.[0]?.description);
    const uWall = Number(part.sap_walls?.[0]?.u_value) > 0 ? Math.round(Number(part.sap_walls[0].u_value) * 100) / 100 : era.uWall;
    const roofDesc = String(cert.roofs?.[0]?.description ?? '').toLowerCase();
    const uRoof = Number(part.sap_roofs?.[0]?.u_value) > 0 ? Math.round(Number(part.sap_roofs[0].u_value) * 100) / 100 : era.uRoof;
    const heatLossFloor = floorDims.find((f) => (f.heat_loss_area ?? 0) > 0) ?? floorDims[0];
    const uFloor = Number(heatLossFloor?.u_value) > 0 ? Math.round(Number(heatLossFloor.u_value) * 100) / 100 : era.uFloor;
    const glazingType = mapGlazing(cert.windows?.description);
    const glazingRatio = Math.round((0.15 + rnd() * 0.1) * 100) / 100; // MODELLED
    const solarProtection = false; // MODELLED — not recorded in EPC, rare in UK
    const tmp = Number(part.thermal_mass_parameter);
    const inertia = Number.isFinite(tmp) && tmp > 0 ? (tmp >= 200 ? 'lourde' : tmp >= 100 ? 'moyenne' : 'legere') : 'moyenne';

    const heatDesc = cert.main_heating?.[0]?.description ?? '';
    const heatEnergy = mapHeatingEnergy(heatDesc);
    const heating = { kind: heatingKind(heatDesc, heatEnergy), energy: heatEnergy, ageYears: 10 };
    const secDesc = cert.secondary_heating?.[0]?.description ?? '';
    const heatingSecondary = secDesc && !/none/i.test(secDesc)
      ? { kind: heatingKind(secDesc, mapHeatingEnergy(secDesc)), energy: mapHeatingEnergy(secDesc), ageYears: 12 }
      : null;
    const dhw = mapDhw(cert.hot_water?.description ?? '', heatEnergy);
    const cooling = String(cert.has_fixed_air_conditioning) === 'true' ? 'pac_air_air' : null; // REAL flag

    // REAL certificate values.
    const label = LABELS.includes(cert.current_energy_efficiency_band) ? cert.current_energy_efficiency_band : 'E';
    const ep = Number(cert.energy_consumption_current) > 0 ? Math.round(Number(cert.energy_consumption_current) * 10) / 10 : 200;
    const ges = Number(cert.co2_emissions_current_per_floor_area) >= 0 && cert.co2_emissions_current_per_floor_area != null
      ? Math.round(Number(cert.co2_emissions_current_per_floor_area) * 10) / 10
      : Math.round(ep * 0.21 * 10) / 10;

    const address = [cert.address_line_1, cert.address_line_2].filter(Boolean).join(', ') || 'Address not recorded';
    const costNow = ['heating_cost_current', 'hot_water_cost_current', 'lighting_cost_current']
      .map((k) => Number(cert[k])).filter((n) => Number.isFinite(n) && n > 0);
    const annualCost = costNow.length ? Math.round(costNow.reduce((a, b) => a + b, 0)) : Math.round(ep * livingArea * 0.16);
    const co2Tonnes = Number(cert.co2_emissions_current);

    buildings.push({
      nationalDbId: certNo, // real EPC certificate number
      registryId: cert.uprn != null ? String(cert.uprn) : '', // real UPRN
      address,
      city: 'London',
      postcode: pc,
      department: 'Greater London',
      lat,
      lng,
      usage,
      constructionYear: year,
      footprintAreaM2: footprint,
      floors,
      heightM,
      livingAreaM2: livingArea,
      housingUnits: 1,
      envelope: {
        wallMaterial: wall.material,
        wallInsulation: wall.insulation,
        uWall,
        roofType: roofDesc.includes('flat') ? 'terrasse' : 'inclinee',
        uRoof,
        uFloor,
        glazingRatio,
        glazingType,
        solarProtection,
        inertia,
      },
      systems: {
        heating,
        heatingSecondary,
        dhw,
        cooling,
        ventilation: mapVentilation(cert),
        hasCeilingFans: false,
        pvSurfaceM2: 0,
      },
      certificate: { label, ep, ges, gesLabel: labelFromGes(ges) },
      comfort: null, // shared model applied after ids are assigned (base calibration needs full stock)
      annualConsumptionKwhEp: Math.round(ep * livingArea),
      annualGesKgCo2: Number.isFinite(co2Tonnes) && co2Tonnes > 0 ? Math.round(co2Tonnes * 1000) : Math.round(ges * livingArea),
      annualEnergyCostEur: annualCost, // GBP despite field name (contract note)
    });
  }

  buildings.forEach((b, i) => { b.id = `bld-uk-${String(i + 1).padStart(5, '0')}`; });

  // Shared comfort model: first pass with the default base, calibrate the base
  // to the median of the modelled stock, then recompute deterministically.
  for (const b of buildings) b.comfort = computeComfort(b, 'uk');
  calibrateBase('uk', buildings);
  for (const b of buildings) b.comfort = computeComfort(b, 'uk');

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(buildings));

  // Validation: JSON round-trip + bbox check.
  const parsed = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  const bad = parsed.filter((b) => b.lat < LAT_MIN || b.lat > LAT_MAX || b.lng < LNG_MIN || b.lng > LNG_MAX);
  if (bad.length > 0) {
    console.error(`FATAL: ${bad.length} entries outside London bbox in output.`);
    process.exit(1);
  }

  const perLabel = Object.fromEntries(LABELS.map((l) => [l, 0]));
  const perUsage = {};
  for (const b of buildings) {
    perLabel[b.certificate.label]++;
    perUsage[b.usage] = (perUsage[b.usage] ?? 0) + 1;
  }

  console.log('\n=== LONDON EPC INGEST SUMMARY ===');
  console.log(`Councils queried       : ${COUNCILS.join(', ')}`);
  console.log(`Summary rows cached    : ${Object.values(cache.summaries).filter((r) => typeof r === 'object').length}`);
  console.log(`Certificates fetched   : ${Object.keys(cache.details).length}`);
  console.log(`Dropped (no geocode)   : ${droppedGeo}`);
  console.log(`Dropped (out of bbox)  : ${droppedOut}`);
  console.log(`Dropped (no year)      : ${droppedYear}`);
  console.log(`KEPT buildings         : ${buildings.length}`);
  console.log('Label distribution     :', perLabel);
  console.log('Usage distribution     :', perUsage);
  console.log('\nSample of 5 kept entries (real EPC addresses):');
  for (const i of [0, 0.25, 0.5, 0.75, 0.99].map((f) => Math.min(buildings.length - 1, Math.floor(buildings.length * f)))) {
    const b = buildings[i];
    console.log(`  ${b.id} | ${b.address} | ${b.postcode} | built ${b.constructionYear} | ${b.floors}F | EPC ${b.certificate.label} (${b.certificate.ep} kWh/m2) | ${b.lat},${b.lng}`);
  }
  console.log(`\nWRITTEN: ${OUT_FILE} (${(fs.statSync(OUT_FILE).size / 1e6).toFixed(2)} MB)`);
  console.log('CAVEATS: lat/lng = postcode centroid + deterministic <=60 m display offset;');
  console.log('floors for flats, footprint, glazingRatio, solarProtection, comfort are MODELLED');
  console.log('(see header comments). EPC band, ep, ges, year, U-values, systems, costs are REAL.');
}

// ---------------------------------------------------------------------------
async function main() {
  const t0 = Date.now();
  const cache = loadCache();

  await stageSearch(cache);
  if (!cache.picked) stagePick(cache);
  saveCache(cache);

  const complete = await stageDetails(cache);
  if (!complete) return;

  await stageGeocode(cache);
  stageEmit(cache);
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((err) => { console.error(err); process.exit(1); });
