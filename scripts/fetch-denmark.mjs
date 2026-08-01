import fs from 'node:fs';
import path from 'node:path';
import { calibrateBase, computeComfort } from './comfort-model.mjs';

const BASE_URL = 'https://emoweb.dk/EMOData/EMOData.svc';
const OUTPUT_FILE = path.resolve('public/data/dk.json');
/** south,west,north,east — default: central Copenhagen. */
const BBOX = (process.env.EMO_BBOX ?? '55.6600,12.5000,55.7100,12.6200').split(',').map(Number);
const PAGE_SIZE = Math.min(Math.max(Number(process.env.EMO_PAGE_SIZE ?? 500), 1), 1000);
/** EMOData rejects requests above ~0.6036 deg². Stay under with margin. */
const MAX_AREA = Number(process.env.EMO_MAX_AREA ?? 0.55);
const MAX_PAGES_PER_TILE = Number(process.env.EMO_MAX_PAGES ?? 200);
const REQUEST_PAUSE_MS = Number(process.env.EMO_PAUSE_MS ?? 200);

function loadEnvFile() {
  try {
    return Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => [line.split('=')[0].trim(), line.split('=').slice(1).join('=').trim()]));
  } catch { return {}; }
}

const localEnv = loadEnvFile();
const user = process.env.EMO_USER ?? localEnv.EMO_USER;
const password = process.env.EMO_PASS ?? localEnv.EMO_PASS;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function label(value) {
  const result = String(value ?? '').toUpperCase().replace(/[^A-G].*$/, '');
  return ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(result) ? result : 'G';
}

function epForLabel(value) {
  return { A: 45, B: 70, C: 110, D: 150, E: 190, F: 240, G: 300 }[label(value)];
}

function heatSystem(value) {
  const source = String(value ?? '').toLowerCase();
  if (source.includes('district')) return { kind: 'reseau_chaleur', energy: 'reseau_chaleur' };
  if (source.includes('naturalgas') || source.includes('gas')) return { kind: 'chaudiere_gaz', energy: 'gaz_naturel' };
  if (source.includes('electric')) return { kind: 'radiateurs_electriques', energy: 'electricite' };
  if (source.includes('heatpump')) return { kind: 'pac_air_eau', energy: 'pac' };
  if (source.includes('wood')) return { kind: 'poele_bois', energy: 'bois' };
  return { kind: 'reseau_chaleur', energy: 'reseau_chaleur' };
}

function era(year) {
  if (year < 1960) return { uWall: 1.7, uRoof: 1.5, uFloor: 1, insulation: 'aucune', glazing: 'double' };
  if (year < 1980) return { uWall: 1, uRoof: 0.6, uFloor: 0.7, insulation: 'iti', glazing: 'double' };
  if (year < 2007) return { uWall: 0.45, uRoof: 0.25, uFloor: 0.35, insulation: 'iti', glazing: 'double' };
  return { uWall: 0.25, uRoof: 0.15, uFloor: 0.2, insulation: 'repartie', glazing: 'triple' };
}

function mapRow(row) {
  const yearRaw = String(row.YearOfConstruction ?? '').split(',')[0].trim();
  const constructionYear = Math.min(Math.max(Number(yearRaw) || 1975, 1600), 2026);
  const envelope = era(constructionYear);
  const heating = heatSystem(row.HeatSupply);
  const rating = label(row.EnergyLabelClassification);
  const livingAreaM2 = 120;
  const building = {
    id: `dk-${row.EntityIdentifier}`,
    nationalDbId: String(row.BFENumber ?? row.EntityIdentifier),
    registryId: String(row.EnergyLabelSerialIdentifier ?? row.EntityIdentifier),
    address: `${row.StreetName ?? ''} ${row.HouseNumber ?? ''}`.trim(),
    city: String(row.CityName ?? ''), postcode: String(row.ZipCode ?? ''), department: String(row.MunicipalityNumber ?? ''),
    lat: Number(row.Wgs84Latitude), lng: Number(row.Wgs84Longitude),
    usage: String(row.EnergyLabelTypeUsage ?? '').toLowerCase().includes('multi') ? 'residential_collective' : 'residential_individual',
    constructionYear, footprintAreaM2: 60, floors: 2, heightM: 6, livingAreaM2, housingUnits: 1,
    envelope: { wallMaterial: 'brique', wallInsulation: envelope.insulation, uWall: envelope.uWall, roofType: 'inclinee', uRoof: envelope.uRoof, uFloor: envelope.uFloor, glazingRatio: 0.2, glazingType: envelope.glazing, solarProtection: false, inertia: 'lourde' },
    systems: { heating: { ...heating, ageYears: 10 }, heatingSecondary: null, dhw: { ...heating, kind: heating.kind === 'reseau_chaleur' ? 'reseau_chaleur' : 'chaudiere', ageYears: 10 }, cooling: null, ventilation: 'naturelle', hasCeilingFans: false, pvSurfaceM2: 0 },
    certificate: { label: rating, ep: epForLabel(rating), ges: 0, gesLabel: rating },
    comfort: { dh2025: 0, dh2050: 0, dh2100: 0 },
    annualConsumptionKwhEp: epForLabel(rating) * livingAreaM2, annualGesKgCo2: 0,
    // Fuel-aware DKK/kWh: fjernvarme ~0.95, electricity ~2.5 (not a flat electric rate).
    annualEnergyCostEur: Math.round(epForLabel(rating) * livingAreaM2 * (
      heating.energy === 'reseau_chaleur' ? 0.95
        : heating.energy === 'electricite' ? 2.5
          : heating.energy === 'gaz_naturel' ? 1.2
            : heating.energy === 'pac' ? 2.2
              : 1.0
    )),
  };
  building.comfort = computeComfort(building, 'dk');
  return building;
}

/** Split a bbox into tiles whose (Δlat × Δlng) stays under EMOData's max area. */
function tileBbox([south, west, north, east], maxArea = MAX_AREA) {
  const dLat = north - south;
  const dLng = east - west;
  if (!(dLat > 0 && dLng > 0)) throw new Error('EMO_BBOX must be south,west,north,east with north>south and east>west.');
  if (dLat * dLng <= maxArea) return [[south, west, north, east]];

  // Prefer ~square-ish tiles under maxArea: latStep * lngStep <= maxArea.
  const latStep = Math.min(dLat, Math.sqrt(maxArea));
  const lngStep = Math.min(dLng, maxArea / latStep);
  const tiles = [];
  for (let s = south; s < north; s += latStep) {
    const n = Math.min(north, s + latStep);
    for (let w = west; w < east; w += lngStep) {
      const e = Math.min(east, w + lngStep);
      tiles.push([s, w, n, e]);
    }
  }
  return tiles;
}

async function fetchPage(authorization, tile, pageNumber) {
  const [south, west, north, east] = tile;
  const query = new URLSearchParams({
    coordinateX1: String(north),
    coordinateY1: String(west),
    coordinateX2: String(south),
    coordinateY2: String(east),
    pageNumber: String(pageNumber),
    pageSize: String(PAGE_SIZE),
  });
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(`${BASE_URL}/GetEnergyLabelInArea?${query}`, {
      headers: { Authorization: authorization, Accept: 'application/json' },
      signal: AbortSignal.timeout(60_000),
    });
    if (response.status === 401) {
      const wait = Math.min(60_000, 2_000 * 2 ** attempt);
      console.warn(`  rate limited (401), waiting ${wait}ms...`);
      await sleep(wait);
      continue;
    }
    if (!response.ok) throw new Error(`EMOData returned HTTP ${response.status} on page ${pageNumber}.`);
    const payload = await response.json();
    if (payload.ResponseStatus?.Status !== 'RESULT_OK') {
      throw new Error(`EMOData error: ${payload.ResponseStatus?.StatusMessage ?? 'unknown error'}`);
    }
    return payload.SearchResults ?? [];
  }
  throw new Error('EMOData rate limit persisted after retries.');
}

async function loadRows() {
  if (process.env.EMO_SOURCE_FILE) return JSON.parse(fs.readFileSync(process.env.EMO_SOURCE_FILE, 'utf8')).SearchResults ?? [];
  if (!user || !password) throw new Error('Set EMO_USER and EMO_PASS in .env.local or the current shell.');
  if (BBOX.length !== 4 || BBOX.some((value) => !Number.isFinite(value))) {
    throw new Error('EMO_BBOX must be south,west,north,east.');
  }

  const authorization = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
  const tiles = tileBbox(BBOX);
  const area = (BBOX[2] - BBOX[0]) * (BBOX[3] - BBOX[1]);
  console.log(`BBox area ${area.toFixed(4)} deg² → ${tiles.length} tile(s) (max ${MAX_AREA} deg² each)`);

  const byId = new Map();
  for (let t = 0; t < tiles.length; t += 1) {
    const tile = tiles[t];
    const [south, west, north, east] = tile;
    console.log(`Tile ${t + 1}/${tiles.length}: ${south.toFixed(4)},${west.toFixed(4)} → ${north.toFixed(4)},${east.toFixed(4)}`);
    for (let pageNumber = 1; pageNumber <= MAX_PAGES_PER_TILE; pageNumber += 1) {
      const page = await fetchPage(authorization, tile, pageNumber);
      for (const row of page) {
        if (row?.EntityIdentifier != null) byId.set(String(row.EntityIdentifier), row);
      }
      console.log(`  page ${pageNumber}: +${page.length} (unique total ${byId.size})`);
      if (page.length < PAGE_SIZE) break;
      await sleep(REQUEST_PAUSE_MS);
    }
    await sleep(REQUEST_PAUSE_MS);
  }
  return [...byId.values()];
}

const rows = await loadRows();
const buildings = rows
  .filter((row) => row.EntityIdentifier && Number.isFinite(Number(row.Wgs84Latitude)) && Number.isFinite(Number(row.Wgs84Longitude)))
  .map(mapRow);
calibrateBase('dk', buildings);
for (const building of buildings) building.comfort = computeComfort(building, 'dk');
fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(buildings)}\n`);
console.log(`WRITTEN ${buildings.length} Danish buildings to ${OUTPUT_FILE}`);
