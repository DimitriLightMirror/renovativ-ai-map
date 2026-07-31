import fs from 'node:fs';
import path from 'node:path';
import { calibrateBase, computeComfort } from './comfort-model.mjs';

const BASE_URL = 'https://emoweb.dk/EMOData/EMOData.svc';
const OUTPUT_FILE = path.resolve('public/data/dk.json');
const BBOX = (process.env.EMO_BBOX ?? '55.6600,12.5000,55.7100,12.6200').split(',').map(Number);
const PAGE_SIZE = Math.min(Math.max(Number(process.env.EMO_PAGE_SIZE ?? 500), 1), 1000);

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

function label(value) {
  const result = String(value ?? '').toUpperCase();
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
  const constructionYear = Math.min(Math.max(Number(row.YearOfConstruction) || 1975, 1600), 2026);
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
    annualConsumptionKwhEp: epForLabel(rating) * livingAreaM2, annualGesKgCo2: 0, annualEnergyCostEur: epForLabel(rating) * livingAreaM2 * 2.5,
  };
  building.comfort = computeComfort(building, 'dk');
  return building;
}

async function loadRows() {
  if (process.env.EMO_SOURCE_FILE) return JSON.parse(fs.readFileSync(process.env.EMO_SOURCE_FILE, 'utf8')).SearchResults ?? [];
  if (!user || !password) throw new Error('Set EMO_USER and EMO_PASS in .env.local or the current shell.');
  if (BBOX.length !== 4 || BBOX.some((value) => !Number.isFinite(value))) throw new Error('EMO_BBOX must be south,west,north,east.');
  const authorization = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
  const rows = [];
  for (let pageNumber = 1; pageNumber <= 100; pageNumber += 1) {
    console.log(`Requesting EMOData page ${pageNumber} (${rows.length} records collected)...`);
    const query = new URLSearchParams({ coordinateX1: String(BBOX[2]), coordinateY1: String(BBOX[1]), coordinateX2: String(BBOX[0]), coordinateY2: String(BBOX[3]), pageNumber: String(pageNumber), pageSize: String(PAGE_SIZE) });
    const response = await fetch(`${BASE_URL}/GetEnergyLabelInArea?${query}`, {
      headers: { Authorization: authorization, Accept: 'application/json' },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`EMOData returned HTTP ${response.status} on page ${pageNumber}.`);
    const payload = await response.json();
    if (payload.ResponseStatus?.Status !== 'RESULT_OK') throw new Error(`EMOData error: ${payload.ResponseStatus?.StatusMessage ?? 'unknown error'}`);
    const page = payload.SearchResults ?? [];
    rows.push(...page);
    console.log(`  received ${page.length} records`);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

const rows = await loadRows();
const buildings = rows.filter((row) => row.EntityIdentifier && Number.isFinite(Number(row.Wgs84Latitude)) && Number.isFinite(Number(row.Wgs84Longitude))).map(mapRow);
calibrateBase('dk', buildings);
for (const building of buildings) building.comfort = computeComfort(building, 'dk');
fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(buildings)}\n`);
console.log(`WRITTEN ${buildings.length} Danish buildings to ${OUTPUT_FILE}`);
