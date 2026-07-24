/**
 * Renovativ AI Map — BDNB ingest pipeline (department 06, Alpes-Maritimes).
 *
 * Replaces the former synthetic generator with REAL open data from the
 * Base de Données Nationale des Bâtiments (CSTB), Licence Ouverte 2.0.
 *
 * Usage:
 *   node scripts/ingest-bdnb.mjs [path-to-bdnb-csv-dir]   (default ../BDNB/csv)
 *
 * Input files (semicolon-delimited CSV, WKT geometry quoted, EPSG:2154):
 *   - batiment_groupe.csv                          geometry + commune
 *   - batiment_groupe_dpe_representatif_logement.csv  DPE + envelope + systems
 *   - batiment_groupe_ffo_bat.csv                  Fichiers Fonciers attributes
 *   - adresse.csv + rel_batiment_groupe_adresse.csv  BAN addresses
 *
 * Output:
 *   - src/data/buildings-fr.json  (compact, capped at CAP buildings, allocated
 *     per commune proportionally to its building stock, DPE holders first)
 *
 * CRS: source geometries are Lambert-93 (EPSG:2154). Centroids are computed in
 * Lambert-93 (area-weighted), footprint areas in m², then centroids are
 * reprojected to WGS84 with proj4. The transform is validated on a known
 * Aiglun point before any mass conversion; out-of-department points are dropped
 * (and abort the run if they exceed 1% of the stock).
 *
 * IMPORTANT — modelled (not BDNB-measured) fields:
 *   - comfort.dh2025/dh2050/dh2100: no summer-comfort indicator table exists in
 *     this BDNB export. Degree-hours of summer discomfort are MODELLED by the
 *     shared model in scripts/comfort-model.mjs (inertia, glazing, solar
 *     protection, era, urban heat island, height, deterministic noise).
 *     dh2050 = 1.45 x dh2025, dh2100 = 2.05 x dh2025 (climate warming factors).
 *   - buildings without a DPE get an era-based certificate estimate
 *     (marked by construction-year defaults; real DPE rows always win the cap).
 *   - envelope U-values / insulation fall back to era-based French defaults
 *     when the DPE does not carry them.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createRequire } from 'node:module';
import { computeComfort, calibrateBase } from './comfort-model.mjs';

const require = createRequire(import.meta.url);
const proj4 = require('proj4');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CSV_DIR = path.resolve(process.argv[2] ?? '../BDNB/csv');
const OUT_FILE = path.resolve('src/data/buildings-fr.json');
const CAP = 12000;

// EPSG:2154 definition (parameters from batiment_groupe.prj in the export).
const L93 =
  '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 ' +
  '+x_0=700000 +y_0=6600000 +ellps=GRS80 +units=m +no_defs';
const toWgs84 = (xy) => proj4(L93, 'WGS84', xy);

// Department 06 sanity bounds.
const LAT_MIN = 43.4, LAT_MAX = 44.4, LNG_MIN = 6.4, LNG_MAX = 7.8;

// CRS self-check: known point in Aiglun (first row of batiment_groupe.csv).
// Real-world Aiglun (06) sits at lat 43.858, lng 6.915 — verified against
// OSM/IGN. (An earlier brief quoted lng 7.19 / lat 43.57; that is NOT Aiglun.)
{
  const [lng, lat] = toWgs84([1014604.6, 6314309.9]);
  const ok = Math.abs(lng - 6.9143) < 0.02 && Math.abs(lat - 43.8576) < 0.02;
  console.log(`CRS check: (1014604.6, 6314309.9) -> lng ${lng.toFixed(4)}, lat ${lat.toFixed(4)} (Aiglun)`);
  if (!ok) {
    console.error('FATAL: Lambert-93 -> WGS84 validation failed. Aborting.');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Streaming CSV helpers (semicolon, quoted fields, no embedded newlines —
// verified: every source file has balanced quotes per line)
// ---------------------------------------------------------------------------

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ';') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function streamCsv(file, onRow) {
  const rl = readline.createInterface({
    input: fs.createReadStream(file, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  let header = null;
  for await (const line of rl) {
    if (line.length === 0) continue;
    if (!header) { header = parseCsvLine(line); continue; }
    onRow(parseCsvLine(line), header);
  }
}

const idx = (header, name) => header.indexOf(name);
const num = (v) => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

// ---------------------------------------------------------------------------
// WKT MULTIPOLYGON parsing (rings contain only numbers/commas/spaces)
// ---------------------------------------------------------------------------

function ringStats(ring) {
  // ring: [[x,y],...] -> signed area + centroid (shoelace)
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    a += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  a /= 2;
  if (Math.abs(a) < 1e-9) return { area: 0, cx: ring[0][0], cy: ring[0][1] };
  return { area: a, cx: cx / (6 * a), cy: cy / (6 * a) };
}

/** Parse "MULTIPOLYGON (((...)),((...)))" -> { areaM2, cx, cy } in Lambert-93. */
function parseMultipolygon(wkt) {
  if (!wkt || !wkt.startsWith('MULTIPOLYGON')) return null;
  // Split into polygon blocks at depth 2, rings at depth 3.
  let totalArea = 0, wx = 0, wy = 0;
  let i = wkt.indexOf('(');
  const n = wkt.length;
  while (i < n) {
    // scan one polygon block "( ... )" starting at depth-1 '('
    if (wkt[i] !== '(') { i++; continue; }
    let depth = 0, j = i;
    for (; j < n; j++) {
      if (wkt[j] === '(') depth++;
      else if (wkt[j] === ')') { depth--; if (depth === 0) break; }
    }
    const block = wkt.slice(i + 1, j); // contents of one polygon: "(ring),(ring)"
    // extract rings (innermost groups)
    const rings = [];
    const re = /\(([^()]*)\)/g;
    let m;
    while ((m = re.exec(block)) !== null) {
      const pts = m[1].split(',').map((p) => {
        const [x, y] = p.trim().split(/\s+/).map(Number);
        return [x, y];
      });
      if (pts.length >= 4) rings.push(pts);
    }
    if (rings.length > 0) {
      const ext = ringStats(rings[0]);
      let polyArea = Math.abs(ext.area);
      for (let k = 1; k < rings.length; k++) polyArea -= Math.abs(ringStats(rings[k]).area);
      if (polyArea > 0) {
        totalArea += polyArea;
        wx += ext.cx * polyArea;
        wy += ext.cy * polyArea;
      }
    }
    i = j + 1;
  }
  if (totalArea <= 0) return null;
  return { areaM2: totalArea, cx: wx / totalArea, cy: wy / totalArea };
}

// ---------------------------------------------------------------------------
// Mapping helpers (French BDNB values -> Building contract)
// ---------------------------------------------------------------------------

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const isLabel = (v) => LABELS.includes(v);

function labelFromEp(ep) {
  if (ep <= 70) return 'A';
  if (ep <= 110) return 'B';
  if (ep <= 180) return 'C';
  if (ep <= 250) return 'D';
  if (ep <= 330) return 'E';
  if (ep <= 420) return 'F';
  return 'G';
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

const PERIOD_MID = {
  'avant 1948': 1930,
  '1948-1974': 1961,
  '1975-1977': 1976,
  '1978-1982': 1980,
  '1983-1988': 1985,
  '1989-2000': 1995,
  '2001-2005': 2003,
  '2006-2012': 2009,
  '2013-2021': 2017,
  'après 2021': 2022,
};

function eraDefaults(year) {
  // Era-based French envelope defaults (modelled; used when DPE carries no U-values).
  if (year < 1948) return { uWall: 2.0, uRoof: 2.0, uFloor: 1.5, glazing: 'simple', insul: 'aucune', ep: 330 };
  if (year < 1975) return { uWall: 1.8, uRoof: 1.5, uFloor: 1.2, glazing: 'simple', insul: 'aucune', ep: 300 };
  if (year < 1989) return { uWall: 1.0, uRoof: 0.8, uFloor: 0.9, glazing: 'double', insul: 'iti', ep: 240 };
  if (year < 2001) return { uWall: 0.7, uRoof: 0.5, uFloor: 0.7, glazing: 'double', insul: 'iti', ep: 190 };
  if (year < 2013) return { uWall: 0.45, uRoof: 0.3, uFloor: 0.5, glazing: 'double', insul: 'iti', ep: 130 };
  return { uWall: 0.25, uRoof: 0.2, uFloor: 0.3, glazing: 'double_renouvele', insul: 'ite', ep: 70 };
}

function mapEnergy(raw, generateur) {
  const e = (raw ?? '').toLowerCase();
  const g = (generateur ?? '').toLowerCase();
  if (g.includes('pac') || g.includes('pompe a chaleur') || g.includes('pompe à chaleur')) return 'pac';
  if (e.includes('gaz')) return 'gaz_naturel';
  if (e.includes('fioul')) return 'fioul';
  if (e.includes('reseau') || e.includes('réseau') || e.includes('chaleur')) return 'reseau_chaleur';
  if (e.includes('bois') || e.includes('biomasse')) return 'bois';
  if (e.includes('gpl') || e.includes('butane') || e.includes('propane') || e.includes('charbon')) return 'fioul';
  if (e.includes('electr')) return 'electricite';
  return 'electricite';
}

function heatingKind(energy, generateur) {
  const g = (generateur ?? '').toLowerCase();
  if (g.includes('pac air/air')) return 'pac_air_air';
  if (g.includes('pac')) return 'pac_air_eau';
  if (g.includes('poele') || g.includes('poêle') || g.includes('insert')) return 'poele_bois';
  if (g.includes('chaudiere gaz') || g.includes('chaudière gaz')) return 'chaudiere_gaz';
  if (g.includes('chaudiere fioul') || g.includes('chaudière fioul')) return 'chaudiere_fioul';
  if (g.includes('chaudiere bois') || g.includes('chaudière bois')) return 'chaudiere_bois';
  if (g.includes('effet joule') || g.includes('radiateur')) return 'radiateurs_electriques';
  if (g.includes('plafond') || g.includes('plancher')) return 'emetteurs_bas_temperature';
  switch (energy) {
    case 'gaz_naturel': return 'chaudiere_gaz';
    case 'fioul': return 'chaudiere_fioul';
    case 'reseau_chaleur': return 'reseau_chaleur';
    case 'bois': return 'poele_bois';
    case 'pac': return 'pac_air_eau';
    default: return 'radiateurs_electriques';
  }
}

function mapAge(raw) {
  const a = (raw ?? '').toLowerCase();
  if (a.includes('très') || a.includes('tres')) return 30;
  if (a.includes('ancien')) return 22;
  if (a.includes('moyen')) return 12;
  if (a.includes('récent') || a.includes('recent')) return 5;
  return 12;
}

function mapVentilation(raw) {
  const v = (raw ?? '').toLowerCase();
  if (v.includes('hygro')) return 'vmc_hygro';
  if (v.includes('double flux')) return 'vmc_double_flux';
  if (v.includes('mécanique') || v.includes('mecanique') || v.includes('vmc') || v.includes('extracteur')) return 'vmc_simple_flux';
  return 'naturelle';
}

function mapUsage(ffoUsage, dpeTypeBat) {
  const u = (ffoUsage ?? '').toLowerCase();
  if (u.includes('individuel') || u.includes('maison')) return 'residential_individual';
  if (u.includes('collectif')) return 'residential_collective';
  if (u.includes('bureau')) return 'tertiary_office';
  if (u.includes('enseign') || u.includes('ecole') || u.includes('école')) return 'tertiary_school';
  if (u.includes('commerce')) return 'tertiary_commerce';
  if (u.includes('tertiaire')) return 'tertiary_office';
  const t = (dpeTypeBat ?? '').toLowerCase();
  if (t.includes('maison')) return 'residential_individual';
  return 'residential_collective';
}

function mapWallMaterial(raw) {
  const m = (raw ?? '').toLowerCase();
  if (m.includes('pierre') || m.includes('meuliere') || m.includes('meulière')) return 'pierre';
  if (m.includes('brique')) return 'brique';
  if (m.includes('bois')) return 'bois';
  if (m.includes('beton') || m.includes('béton')) return 'beton';
  if (m.includes('agglomere') || m.includes('aggloméré')) return 'parpaing';
  return 'parpaing';
}

function mapRoofType(raw) {
  const t = (raw ?? '').toLowerCase();
  if (t.includes('beton') || t.includes('béton') || t.includes('terrasse') || t.includes('plat')) return 'terrasse';
  return 'inclinee';
}

function mapInsulation(raw, fallback) {
  const v = (raw ?? '').toLowerCase();
  if (v.includes('ite')) return 'ite';
  if (v.includes('iti')) return 'iti';
  if (v.includes('itr') || v.includes('repartie') || v.includes('répartie')) return 'repartie';
  if (v.includes('non isole') || v.includes('non isolé')) return 'aucune';
  if (v === 'isole' || v === 'isolé') return 'iti';
  return fallback;
}

function mapInertia(dpeInertia, wallMaterial) {
  const v = (dpeInertia ?? '').toLowerCase();
  if (v.includes('lourde')) return 'lourde';
  if (v.includes('moyenne')) return 'moyenne';
  if (v.includes('légère') || v.includes('legere')) return 'legere';
  if (wallMaterial === 'pierre' || wallMaterial === 'beton') return 'lourde';
  if (wallMaterial === 'bois') return 'legere';
  return 'moyenne';
}

// ---------------------------------------------------------------------------
// MODELLED summer comfort — NOT a BDNB measurement.
// Shared model in scripts/comfort-model.mjs: per-city median base, modulated
// by inertia, glazing ratio, solar protection, construction era, urban heat
// island (distance to region centre), height and a deterministic per-building
// noise. Climate horizons: dh2050 = 1.45 x, dh2100 = 2.05 x.
// ---------------------------------------------------------------------------

// kgCO2 per kWhEP, rough French content factors for era-based GES estimates.
const GES_FACTOR = {
  gaz_naturel: 0.23, fioul: 0.32, electricite: 0.06,
  reseau_chaleur: 0.15, bois: 0.03, pac: 0.05,
};

// ---------------------------------------------------------------------------
// Ingest passes
// ---------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  for (const f of [
    'batiment_groupe.csv',
    'batiment_groupe_dpe_representatif_logement.csv',
    'batiment_groupe_ffo_bat.csv',
    'adresse.csv',
    'rel_batiment_groupe_adresse.csv',
  ]) {
    if (!fs.existsSync(path.join(CSV_DIR, f))) {
      console.error(`FATAL: missing source file ${path.join(CSV_DIR, f)}`);
      process.exit(1);
    }
  }

  // Pass 1 — DPE representatif logement (one row per building, prefer 2021 arrêté with a label).
  const dpeMap = new Map();
  await streamCsv(path.join(CSV_DIR, 'batiment_groupe_dpe_representatif_logement.csv'), (r, h) => {
    const id = r[idx(h, 'batiment_groupe_id')];
    const label = r[idx(h, 'classe_bilan_dpe')];
    if (!isLabel(label)) return;
    const prev = dpeMap.get(id);
    const is2021 = r[idx(h, 'arrete_2021')] === '1';
    if (prev && !(is2021 && !prev.is2021)) return;
    dpeMap.set(id, {
      is2021,
      label,
      gesLabel: r[idx(h, 'classe_emission_ges')],
      ep: num(r[idx(h, 'conso_5_usages_ep_m2')]),
      ges: num(r[idx(h, 'emission_ges_5_usages_m2')]),
      livingArea: num(r[idx(h, 'surface_habitable_immeuble')]),
      floors: num(r[idx(h, 'nombre_niveau_immeuble')]),
      year: num(r[idx(h, 'annee_construction_dpe')]),
      period: r[idx(h, 'periode_construction_dpe')],
      typeBat: r[idx(h, 'type_batiment_dpe')],
      heatEnergy: r[idx(h, 'type_energie_chauffage')],
      heatGen: r[idx(h, 'type_generateur_chauffage')],
      heatAge: r[idx(h, 'type_generateur_chauffage_anciennete')],
      heatAppEnergy: r[idx(h, 'type_energie_chauffage_appoint')],
      heatAppGen: r[idx(h, 'type_generateur_chauffage_appoint')],
      climEnergy: r[idx(h, 'type_energie_climatisation')],
      climGen: r[idx(h, 'type_generateur_climatisation')],
      ecsEnergy: r[idx(h, 'type_energie_ecs')],
      ecsGen: r[idx(h, 'type_generateur_ecs')],
      ventilation: r[idx(h, 'type_ventilation')],
      vitrage: r[idx(h, 'type_vitrage')],
      fermeture: r[idx(h, 'type_fermeture')],
      glazingPct: num(r[idx(h, 'pourcentage_surface_baie_vitree_exterieur')]),
      isolationMur: r[idx(h, 'type_isolation_mur_exterieur')],
      uMur: num(r[idx(h, 'u_mur_exterieur')]),
      uPlancherBas: num(r[idx(h, 'u_plancher_bas_final_deperditif')]),
      uPlancherHaut: num(r[idx(h, 'u_plancher_haut_deperditif')]),
      inertie: r[idx(h, 'classe_inertie')],
    });
  });
  console.log(`Pass 1: ${dpeMap.size} DPE records`);

  // Pass 2 — FFO attributes.
  const ffoMap = new Map();
  await streamCsv(path.join(CSV_DIR, 'batiment_groupe_ffo_bat.csv'), (r, h) => {
    const id = r[idx(h, 'batiment_groupe_id')];
    if (ffoMap.has(id)) return;
    ffoMap.set(id, {
      floors: num(r[idx(h, 'nb_niveau')]),
      year: num(r[idx(h, 'annee_construction')]),
      usage: r[idx(h, 'usage_niveau_1_txt')],
      matMur: r[idx(h, 'mat_mur_txt')],
      matToit: r[idx(h, 'mat_toit_txt')],
      nbLog: num(r[idx(h, 'nb_log')]),
    });
  });
  console.log(`Pass 2: ${ffoMap.size} FFO records`);

  // Pass 3 — building/address relation: keep the most reliable address per building.
  const relMap = new Map(); // id -> { cle, fiab }
  const wantedCles = new Set();
  await streamCsv(path.join(CSV_DIR, 'rel_batiment_groupe_adresse.csv'), (r, h) => {
    const id = r[idx(h, 'batiment_groupe_id')];
    const cle = r[idx(h, 'cle_interop_adr')];
    const fiab = num(r[idx(h, 'fiabilite')]) ?? 0;
    const prev = relMap.get(id);
    if (!prev || fiab > prev.fiab) relMap.set(id, { cle, fiab });
  });
  for (const { cle } of relMap.values()) wantedCles.add(cle);
  console.log(`Pass 3: ${relMap.size} address links`);

  // Pass 4 — addresses (only referenced ones).
  const adrMap = new Map();
  await streamCsv(path.join(CSV_DIR, 'adresse.csv'), (r, h) => {
    const cle = r[idx(h, 'cle_interop_adr')];
    if (!wantedCles.has(cle) || adrMap.has(cle)) return;
    adrMap.set(cle, {
      libelle: r[idx(h, 'libelle_adresse')],
      postcode: r[idx(h, 'code_postal')],
      commune: r[idx(h, 'libelle_commune')],
    });
  });
  console.log(`Pass 4: ${adrMap.size} addresses loaded`);

  // Pass 5 — count building stock per commune.
  const communeCount = new Map(); // code -> { name, count }
  let totalParsed = 0;
  await streamCsv(path.join(CSV_DIR, 'batiment_groupe.csv'), (r, h) => {
    totalParsed++;
    const code = r[idx(h, 'code_commune_insee')];
    const name = r[idx(h, 'libelle_commune_insee')];
    const c = communeCount.get(code);
    if (c) c.count++;
    else communeCount.set(code, { name, count: 1 });
  });
  console.log(`Pass 5: ${totalParsed} buildings in ${communeCount.size} communes`);

  // Proportional per-commune quota (largest remainder, exactly CAP total).
  const quotas = new Map();
  {
    const entries = [...communeCount.entries()].map(([code, c]) => {
      const exact = (CAP * c.count) / totalParsed;
      return { code, exact, floor: Math.max(1, Math.floor(exact)) };
    });
    let sum = entries.reduce((s, e) => s + e.floor, 0);
    entries.sort((a, b) => (b.exact - b.floor) - (a.exact - a.floor));
    for (let i = 0; sum < CAP; i = (i + 1) % entries.length) { entries[i].floor++; sum++; }
    for (const e of entries) quotas.set(e.code, e.floor);
  }

  // Pass 6 — join + select (DPE holders prioritized within each commune quota).
  const kept = new Map(); // commune code -> { dpe: [], noDpe: [] }
  let outOfBounds = 0;
  const pushCandidate = (code, rec, hasDpe) => {
    const q = quotas.get(code) ?? 0;
    let bucket = kept.get(code);
    if (!bucket) { bucket = { dpe: [], noDpe: [] }; kept.set(code, bucket); }
    const total = bucket.dpe.length + bucket.noDpe.length;
    if (hasDpe) {
      if (total < q) bucket.dpe.push(rec);
      else if (bucket.noDpe.length > 0) { bucket.noDpe.pop(); bucket.dpe.push(rec); }
      // else quota already filled with DPE holders: skip
    } else if (total < q) bucket.noDpe.push(rec);
  };

  await streamCsv(path.join(CSV_DIR, 'batiment_groupe.csv'), (r, h) => {
    const id = r[idx(h, 'batiment_groupe_id')];
    const code = r[idx(h, 'code_commune_insee')];
    const commune = r[idx(h, 'libelle_commune_insee')];
    const geom = parseMultipolygon(r[idx(h, 'geom_groupe')]);
    if (!geom) return;
    const [lng, lat] = toWgs84([geom.cx, geom.cy]);
    if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) { outOfBounds++; return; }

    const dpe = dpeMap.get(id) ?? null;
    const ffo = ffoMap.get(id) ?? null;

    // Construction year: DPE year > DPE period midpoint > FFO year > 1975.
    let year = dpe?.year && dpe.year > 1500 && dpe.year <= 2026 ? Math.round(dpe.year) : null;
    if (!year && dpe?.period && PERIOD_MID[dpe.period]) year = PERIOD_MID[dpe.period];
    if (!year && ffo?.year && ffo.year > 1500 && ffo.year <= 2026) year = Math.round(ffo.year);
    if (!year) year = 1975;
    const era = eraDefaults(year);

    const floors = Math.max(1, Math.round(dpe?.floors ?? ffo?.floors ?? (dpe?.typeBat === 'maison' ? 1 : 2)));
    const footprint = Math.round(geom.areaM2);
    const livingArea = Math.round(
      dpe?.livingArea && dpe.livingArea > 10 ? dpe.livingArea : footprint * floors * 0.8,
    );
    const housingUnits = Math.max(0, Math.round(ffo?.nbLog ?? livingArea / 65));

    const heatEnergy = mapEnergy(dpe?.heatEnergy, dpe?.heatGen);
    const heating = { kind: heatingKind(heatEnergy, dpe?.heatGen), energy: heatEnergy, ageYears: mapAge(dpe?.heatAge) };
    const heatingSecondary = dpe?.heatAppEnergy || dpe?.heatAppGen
      ? {
          kind: heatingKind(mapEnergy(dpe.heatAppEnergy, dpe.heatAppGen), dpe.heatAppGen),
          energy: mapEnergy(dpe.heatAppEnergy, dpe.heatAppGen),
          ageYears: 12,
        }
      : null;
    const ecsEnergy = mapEnergy(dpe?.ecsEnergy, dpe?.ecsGen);
    const ecsGen = (dpe?.ecsGen ?? '').toLowerCase();
    const dhw = {
      kind: ecsGen.includes('thermodynamique') ? 'chauffe_eau_thermodynamique'
        : ecsGen.includes('ballon') ? 'chauffe_eau_electrique'
        : ecsGen.includes('chaudiere') || ecsGen.includes('chaudière') ? 'chaudiere'
        : 'chauffe_eau_electrique',
      energy: ecsEnergy,
      ageYears: 10,
    };

    // Certificate: real DPE values when present, else era-based model.
    let ep = dpe?.ep && dpe.ep > 0 ? dpe.ep : era.ep;
    let ges = dpe?.ges && dpe.ges >= 0 ? dpe.ges : ep * (GES_FACTOR[heatEnergy] ?? 0.1);
    const label = dpe?.label ?? labelFromEp(ep);
    const gesLabel = isLabel(dpe?.gesLabel) ? dpe.gesLabel : labelFromGes(ges);
    ep = Math.round(ep * 10) / 10;
    ges = Math.round(ges * 10) / 10;

    const wallMaterial = mapWallMaterial(ffo?.matMur);
    const glazingRatio = dpe?.glazingPct && dpe.glazingPct > 0
      ? Math.min(0.6, Math.max(0.05, dpe.glazingPct / 100))
      : 0.2;
    const vitrage = (dpe?.vitrage ?? '').toLowerCase();
    const glazingType = vitrage.includes('triple') ? 'triple'
      : vitrage.includes('double') ? 'double'
      : vitrage.includes('simple') ? 'simple'
      : era.glazing;
    const solarProtection = Boolean(dpe?.fermeture && dpe.fermeture.trim() !== '');
    const inertia = mapInertia(dpe?.inertie, wallMaterial);

    // Address (BAN): strip trailing "<postcode> <commune>" from the full label.
    const rel = relMap.get(id);
    const adr = rel ? adrMap.get(rel.cle) : null;
    const postcode = adr?.postcode ?? '';
    let address = 'Adresse non référencée';
    if (adr?.libelle) {
      address = adr.libelle;
      const suffix = `${adr.postcode} ${adr.commune}`.toLowerCase();
      if (adr.postcode && adr.commune && address.toLowerCase().endsWith(suffix)) {
        address = address.slice(0, address.length - suffix.length).trim();
      }
    }

    const annualConsumption = Math.round(ep * livingArea);
    const rec = {
      nationalDbId: id,
      registryId: '', // no RNB join table in this export
      address,
      city: commune,
      postcode,
      department: 'Alpes-Maritimes (06)',
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
      usage: mapUsage(ffo?.usage, dpe?.typeBat),
      constructionYear: year,
      footprintAreaM2: footprint,
      floors,
      heightM: Math.round(floors * 3 * 10) / 10,
      livingAreaM2: livingArea,
      housingUnits,
      envelope: {
        wallMaterial,
        wallInsulation: mapInsulation(dpe?.isolationMur, era.insul),
        uWall: dpe?.uMur && dpe.uMur > 0 ? Math.round(dpe.uMur * 100) / 100 : era.uWall,
        roofType: mapRoofType(ffo?.matToit),
        uRoof: dpe?.uPlancherHaut && dpe.uPlancherHaut > 0 ? Math.round(dpe.uPlancherHaut * 100) / 100 : era.uRoof,
        uFloor: dpe?.uPlancherBas && dpe.uPlancherBas > 0 ? Math.round(dpe.uPlancherBas * 100) / 100 : era.uFloor,
        glazingRatio: Math.round(glazingRatio * 100) / 100,
        glazingType,
        solarProtection,
        inertia,
      },
      systems: {
        heating,
        heatingSecondary,
        dhw,
        cooling: dpe?.climEnergy || dpe?.climGen ? 'pac_air_air' : null,
        ventilation: mapVentilation(dpe?.ventilation),
        hasCeilingFans: false,
        pvSurfaceM2: 0,
      },
      certificate: { label, ep, ges, gesLabel },
      comfort: null, // shared model applied after selection (needs id + full stock for base calibration)
      annualConsumptionKwhEp: annualConsumption,
      annualGesKgCo2: Math.round(ges * livingArea),
      annualEnergyCostEur: Math.round(annualConsumption * 0.15),
    };
    pushCandidate(code, rec, Boolean(dpe));
  });

  const droppedPct = (outOfBounds / totalParsed) * 100;
  console.log(`Pass 6: ${outOfBounds} out-of-bounds geometries dropped (${droppedPct.toFixed(3)}%)`);
  if (droppedPct > 1) {
    console.error('FATAL: more than 1% of buildings fall outside department 06 bounds — CRS problem? Aborting.');
    process.exit(1);
  }

  // Flatten (DPE first) and assign sequential ids.
  const buildings = [];
  for (const { dpe, noDpe } of kept.values()) buildings.push(...dpe, ...noDpe);
  buildings.forEach((b, i) => { b.id = `bld-${String(i + 1).padStart(5, '0')}`; });

  // Shared comfort model: first pass with the default base, calibrate the base
  // to the median of the modelled stock, then recompute deterministically.
  for (const b of buildings) b.comfort = computeComfort(b, 'fr');
  calibrateBase('fr', buildings);
  for (const b of buildings) b.comfort = computeComfort(b, 'fr');

  fs.writeFileSync(OUT_FILE, JSON.stringify(buildings));

  // Summary.
  const perLabel = Object.fromEntries(LABELS.map((l) => [l, 0]));
  const perCommune = new Map();
  let withDpe = 0;
  for (const b of buildings) {
    perLabel[b.certificate.label]++;
    perCommune.set(b.city, (perCommune.get(b.city) ?? 0) + 1);
    if (dpeMap.has(b.nationalDbId)) withDpe++;
  }
  console.log('\n=== INGEST SUMMARY ===');
  console.log(`Source buildings parsed : ${totalParsed}`);
  console.log(`Kept (cap ${CAP})        : ${buildings.length}`);
  console.log(`With real DPE           : ${withDpe} (${((withDpe / buildings.length) * 100).toFixed(1)}%)`);
  console.log('Label distribution      :', perLabel);
  console.log('Top 10 communes         :');
  [...perCommune.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    .forEach(([c, n]) => console.log(`  ${c}: ${n}`));
  console.log(`Written: ${OUT_FILE} (${(fs.statSync(OUT_FILE).size / 1e6).toFixed(1)} MB)`);
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((err) => { console.error(err); process.exit(1); });
