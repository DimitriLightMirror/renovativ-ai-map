/**
 * Renovativ AI Map — Netherlands ingest pipeline (branch `netherlands`).
 *
 * Pulls REAL Dutch buildings from the PDOK BAG (Basisregistratie Adressen en
 * Gebouwen) WFS v2.0 — keyless national open data:
 *   https://service.pdok.nl/lv/bag/wfs/v2_0
 * Layers used:
 *   - bag:pand              building footprints (bouwjaar, gebruiksdoel, geometry)
 *   - bag:verblijfsobject   addressable units (straat, huisnummer, postcode,
 *                           gebruiksdoel, oppervlakte, pand link)
 *
 * Sample: ~8000 buildings, quota per city, across Amsterdam, Rotterdam,
 * Den Haag and Utrecht. Output: src/data/buildings-nl.json.
 *
 * CRS: BAG geometry is RD New (EPSG:28992, Amersfoort datum). Centroids are
 * computed in RD (area-weighted shoelace), footprint areas in m2, then
 * reprojected to WGS84 with proj4. The transform is VALIDATED on a known
 * Dam Square point (Royal Palace, RD 121357,487373 -> lat 52.373, lng 4.893)
 * before any mass conversion; the run aborts if validation fails or if more
 * than 1% of buildings land outside Dutch bounds.
 *
 * IMPORTANT — modelled (NOT measured) fields:
 *   - certificate.* : EP-online energielabels require an API key (RVO, see
 *     https://www.ep-online.nl/PublicData and the overheid.io client in
 *     src/api/epOnline.ts). No keyless energielabel source exists, so the
 *     energielabel is ESTIMATED from bouwjaar-era Dutch archetypes
 *     (rijtjeshuizen, portiekflats, galerijflats, vrijstaand) mapped onto the
 *     Dutch A++..G scale, itself collapsed onto the shared A..G contract
 *     (A++/A+/A -> 'A'). Every label in this dataset is an estimate.
 *   - systems.*     : modelled from Dutch stock statistics (gas CV-ketel
 *     dominant, growing warmtepomp share, cooling rare).
 *   - comfort.*     : modelled summer discomfort degree-hours for the Dutch
 *     maritime climate (dh2025 base 250-800, dh2050 = x1.6, dh2100 = x2.3).
 *     Dutch regulation uses TOjuli (NTA 8800) instead of degree-hours; this
 *     app keeps the shared DH contract, so treat DH as a modelled proxy.
 *   - envelope.*    : U-values/insulation are era-based Dutch defaults; the
 *     BAG WFS does not carry envelope attributes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const proj4 = require('proj4');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OUT_FILE = path.resolve('src/data/buildings-nl.json');
const WFS = 'https://service.pdok.nl/lv/bag/wfs/v2_0';
const CITY_QUOTA = 2000;
const PAGE = 1000; // PDOK WFS max features per request
const CELL = 2000; // bbox tile size in RD meters
const MAX_CELLS_PER_CITY = 25;
const VBO_CELL_CAP = 8000; // central cells hold thousands of units
const REQUEST_DELAY_MS = 250;

const CITIES = [
  { name: 'Amsterdam', province: 'Noord-Holland', cx: 122000, cy: 487500 },
  { name: 'Rotterdam', province: 'Zuid-Holland', cx: 92000, cy: 436500 },
  { name: 'Den Haag', province: 'Zuid-Holland', cx: 81000, cy: 455000 },
  { name: 'Utrecht', province: 'Utrecht', cx: 136500, cy: 456000 },
];

// RD New (EPSG:28992) with the official 7-parameter Bessel -> WGS84 towgs84.
const RD_NEW =
  '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 ' +
  '+k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m ' +
  '+towgs84=565.4171,50.3319,465.5524,-0.398957,0.343988,-1.87740,4.0725 +no_defs';
const toWgs84 = (xy) => proj4(RD_NEW, 'EPSG:4326', xy);

// Netherlands sanity bounds (WGS84).
const LAT_MIN = 50.7, LAT_MAX = 53.6, LNG_MIN = 3.3, LNG_MAX = 7.3;

// CRS self-check: Royal Palace on Dam Square, Amsterdam.
// RD (121357, 487373) must land at lat ~52.3731, lng ~4.8932 (verified
// against OSM/Kadaster). Same validation discipline as the French
// Lambert-93 pipeline; abort on failure.
{
  const [lng, lat] = toWgs84([121357, 487373]);
  const ok = Math.abs(lat - 52.3731) < 0.003 && Math.abs(lng - 4.8932) < 0.003;
  console.log(
    `CRS check: RD (121357, 487373) -> lat ${lat.toFixed(6)}, lng ${lng.toFixed(6)} (Dam Square)`,
  );
  if (!ok) {
    console.error('FATAL: RD New -> WGS84 validation failed. Aborting.');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// WFS helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wfsGet(typeName, bbox, startIndex = 0) {
  const params = new URLSearchParams({
    request: 'GetFeature',
    service: 'WFS',
    version: '2.0.0',
    typeNames: typeName,
    count: String(PAGE),
    startIndex: String(startIndex),
    outputFormat: 'json',
    srsName: 'EPSG:28992',
    bbox: `${bbox.join(',')},EPSG:28992`,
  });
  const url = `${WFS}?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!res.ok) throw new Error(`WFS ${typeName} HTTP ${res.status} at ${url}`);
  return res.json();
}

/** Fetch one layer over one bbox cell, paginated, capped per cell. */
async function fetchCell(typeName, bbox, cellCap = 4000) {
  const out = [];
  let startIndex = 0;
  for (;;) {
    const fc = await wfsGet(typeName, bbox, startIndex);
    const feats = fc.features ?? [];
    out.push(...feats);
    await sleep(REQUEST_DELAY_MS);
    if (feats.length < PAGE || out.length >= cellCap) break;
    startIndex += PAGE;
  }
  return out;
}

/** Cells of CELL x CELL meters around the city center, center-out order. */
function* cityCells(city) {
  const cells = [];
  for (let gx = -2; gx <= 1; gx++) {
    for (let gy = -2; gy <= 1; gy++) {
      const x0 = city.cx + gx * CELL;
      const y0 = city.cy + gy * CELL;
      const dist = Math.abs(x0 + CELL / 2 - city.cx) + Math.abs(y0 + CELL / 2 - city.cy);
      cells.push({ bbox: [x0, y0, x0 + CELL, y0 + CELL], dist });
    }
  }
  cells.sort((a, b) => a.dist - b.dist);
  for (const c of cells.slice(0, MAX_CELLS_PER_CITY)) yield c.bbox;
}

// ---------------------------------------------------------------------------
// Geometry (RD meters): area + area-weighted centroid via shoelace
// ---------------------------------------------------------------------------

function ringStats(ring) {
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

function polygonStats(geometry) {
  if (!geometry) return null;
  const polys =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates
        : null;
  if (!polys) return null;
  let totalArea = 0, wx = 0, wy = 0;
  for (const rings of polys) {
    if (!rings.length) continue;
    const ext = ringStats(rings[0]);
    let area = Math.abs(ext.area);
    for (let k = 1; k < rings.length; k++) area -= Math.abs(ringStats(rings[k]).area);
    if (area > 0) {
      totalArea += area;
      wx += ext.cx * area;
      wy += ext.cy * area;
    }
  }
  if (totalArea <= 0) return null;
  return { areaM2: totalArea, cx: wx / totalArea, cy: wy / totalArea };
}

// ---------------------------------------------------------------------------
// Deterministic pseudo-random from a string id (stable reruns)
// ---------------------------------------------------------------------------

function hash01(id, salt) {
  let h = 2166136261;
  const s = `${id}|${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// ---------------------------------------------------------------------------
// Dutch energielabel scale (documented mapping, see src/engine/dpe.ts):
// official classes A++/A+/A collapse onto shared contract class 'A'.
// ---------------------------------------------------------------------------

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const EP_THRESHOLDS = [120, 165, 205, 250, 300, 360];
const GES_THRESHOLDS = [25, 35, 43, 53, 63, 76];

function labelFrom(value, thresholds) {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return LABELS[i];
  }
  return 'G';
}

// kgCO2 per kWhEP, Dutch content factors (modelled).
const GES_FACTOR = {
  gaz_naturel: 0.21,
  fioul: 0.3,
  electricite: 0.09,
  reseau_chaleur: 0.15,
  bois: 0.03,
  pac: 0.06,
};

// ---------------------------------------------------------------------------
// Dutch stock archetypes (modelled from bouwjaar; BAG carries no envelope)
// ---------------------------------------------------------------------------

function eraDefaults(year, usage) {
  // Dutch eras: pre-war (vooroorlogs), wederopbouw 1946-1974, jaren 70-90,
  // 1992-2005 (first Bouwbesluit insulation), 2006-2014, 2015-2020, BENG 2021+.
  if (year < 1946) return { uWall: 2.0, uRoof: 2.0, uFloor: 1.3, glazing: 'simple', insul: 'aucune', epI: 340, epC: 300, glazingRatio: 0.18 };
  if (year < 1975) return { uWall: 1.8, uRoof: 1.5, uFloor: 1.2, glazing: 'simple', insul: 'aucune', epI: 300, epC: 280, glazingRatio: 0.22 };
  if (year < 1992) return { uWall: 1.2, uRoof: 0.9, uFloor: 1.0, glazing: 'double', insul: 'iti', epI: 250, epC: 235, glazingRatio: 0.2 };
  if (year < 2006) return { uWall: 0.7, uRoof: 0.5, uFloor: 0.7, glazing: 'double', insul: 'iti', epI: 200, epC: 185, glazingRatio: 0.18 };
  if (year < 2015) return { uWall: 0.45, uRoof: 0.3, uFloor: 0.5, glazing: 'double', insul: 'iti', epI: 150, epC: 140, glazingRatio: 0.2 };
  if (year < 2021) return { uWall: 0.3, uRoof: 0.22, uFloor: 0.35, glazing: 'double_renouvele', insul: 'ite', epI: 100, epC: 95, glazingRatio: 0.2 };
  return { uWall: 0.2, uRoof: 0.15, uFloor: 0.25, glazing: 'triple', insul: 'ite', epI: 60, epC: 55, glazingRatio: 0.22 };
}

/** Modelled Dutch heating system (gas CV-ketel dominant, warmtepomp growing). */
function modelHeating(year, usage, id) {
  const r = hash01(id, 'heating');
  if (year >= 2021) {
    if (r < 0.5) return { kind: 'warmtepomp_lucht_water', energy: 'pac', ageYears: 2 };
    if (r < 0.75) return { kind: 'stadsverwarming', energy: 'reseau_chaleur', ageYears: 5 };
    return { kind: 'cv_ketel_hr', energy: 'gaz_naturel', ageYears: 3 };
  }
  if (year >= 2015) {
    if (r < 0.2) return { kind: 'warmtepomp_lucht_water', energy: 'pac', ageYears: 5 };
    if (r < 0.3) return { kind: 'stadsverwarming', energy: 'reseau_chaleur', ageYears: 8 };
    return { kind: 'cv_ketel_hr', energy: 'gaz_naturel', ageYears: 8 };
  }
  if (year >= 1992) return { kind: 'cv_ketel_hr', energy: 'gaz_naturel', ageYears: 14 };
  // Pre-1992: gas CV dominant; share of post-war flats on block/district heat.
  if (usage === 'residential_collective' && year >= 1946 && r < 0.25) {
    return { kind: 'stadsverwarming', energy: 'reseau_chaleur', ageYears: 20 };
  }
  return { kind: 'cv_ketel', energy: 'gaz_naturel', ageYears: 25 };
}

function modelDhw(heating) {
  if (heating.energy === 'pac') return { kind: 'warmtepompboiler', energy: 'pac', ageYears: heating.ageYears };
  if (heating.energy === 'reseau_chaleur') return { kind: 'stadsverwarming', energy: 'reseau_chaleur', ageYears: heating.ageYears };
  return { kind: 'cv_ketel_combi', energy: 'gaz_naturel', ageYears: heating.ageYears };
}

function modelVentilation(year) {
  if (year >= 2015) return 'vmc_double_flux'; // WTW standard in recent builds
  if (year >= 1992) return 'vmc_simple_flux'; // mechanische ventilatie
  return 'naturelle';
}

/** MODELLED summer comfort, Dutch maritime climate (dh2025 base 250-800). */
function modelComfort({ inertia, glazingRatio, solarProtection, roofType, constructionYear }) {
  let dh = 500;
  dh *= inertia === 'lourde' ? 0.75 : inertia === 'legere' ? 1.25 : 1.0;
  dh *= 0.85 + glazingRatio; // more glass -> more solar gain
  if (solarProtection) dh *= 0.9;
  if (roofType === 'terrasse') dh *= 1.15; // flat roofs overheat the top floor
  if (constructionYear >= 2015) dh *= 0.9;
  dh = Math.min(800, Math.max(250, dh));
  // Climate warming factors for the Dutch maritime climate (modelled).
  return {
    dh2025: Math.round(dh),
    dh2050: Math.round(dh * 1.6),
    dh2100: Math.round(dh * 2.3),
  };
}

// ---------------------------------------------------------------------------
// BAG value mapping
// ---------------------------------------------------------------------------

const VBO_WOON = 'woonfunctie';
// BAG gebruiksdoel -> contract usage. Assembly (bijeenkomst) and healthcare
// buildings are heated occupied spaces; mapped onto the closest contract
// usage (tertiary_office) with full knowledge that it is an approximation.
const USAGE_MAP = {
  kantoorfunctie: 'tertiary_office',
  onderwijsfunctie: 'tertiary_school',
  winkelfunctie: 'tertiary_commerce',
  bijeenkomstfunctie: 'tertiary_office',
  gezondheidszorgfunctie: 'tertiary_office',
};

function mapUsage(vbos, housingUnits) {
  const counts = new Map();
  for (const v of vbos) {
    for (const g of String(v.gebruiksdoel ?? '').split(',')) {
      const key = g.trim();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  // Residential wins whenever a real share of units is woonfunctie.
  if ((counts.get(VBO_WOON) ?? 0) > 0) {
    return housingUnits <= 1 ? 'residential_individual' : 'residential_collective';
  }
  for (const [g] of top) {
    if (USAGE_MAP[g]) return USAGE_MAP[g];
  }
  if (counts.get('logiesfunctie')) return 'residential_collective';
  return null; // industrie, sport, bijeenkomst etc: skipped
}

function formatAddress(v) {
  const street = v.openbare_ruimte ?? 'Onbekende straat';
  const nr = v.huisnummer != null ? String(v.huisnummer) : '';
  const extra = `${v.huisletter ?? ''}${v.toevoeging ? `-${v.toevoeging}` : ''}`;
  return `${street} ${nr}${extra}`.trim();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  const buildings = [];
  let outOfBounds = 0;

  for (const city of CITIES) {
    const pandById = new Map();
    const vboByPand = new Map();

    for (const bbox of cityCells(city)) {
      // Stop fetching cells once we plausibly have enough candidates: only
      // ~40-55% of panden survive the vbo join and usage filter.
      if (pandById.size >= CITY_QUOTA * 6) break;
      const [panden, vbos] = await Promise.all([
        fetchCell('bag:pand', bbox),
        fetchCell('bag:verblijfsobject', bbox, VBO_CELL_CAP),
      ]);
      for (const f of panden) {
        const p = f.properties ?? {};
        const id = p.identificatie;
        if (!id || pandById.has(id)) continue;
        if (p.status !== 'Pand in gebruik') continue;
        const year = Number(p.bouwjaar);
        if (!Number.isFinite(year) || year < 1000 || year > 2026) continue;
        const geom = polygonStats(f.geometry);
        if (!geom || geom.areaM2 < 25) continue; // sheds, meterkasten
        if (!Number(p.aantal_verblijfsobjecten)) continue;
        pandById.set(id, { year, geom });
      }
      for (const f of vbos) {
        const p = f.properties ?? {};
        if (p.status !== 'Verblijfsobject in gebruik') continue;
        const pid = p.pandidentificatie;
        if (!pid) continue;
        let arr = vboByPand.get(pid);
        if (!arr) { arr = []; vboByPand.set(pid, arr); }
        arr.push(p);
      }
      console.log(
        `${city.name}: cell ${bbox.join(',')} -> panden ${pandById.size}, panden met vbo ${vboByPand.size}`,
      );
    }

    let kept = 0;
    for (const [pandId, pand] of pandById) {
      if (kept >= CITY_QUOTA) break;
      const vbos = vboByPand.get(pandId);
      if (!vbos || vbos.length === 0) continue;

      const housingUnits = vbos.filter((v) =>
        String(v.gebruiksdoel ?? '').includes(VBO_WOON),
      ).length;
      const usage = mapUsage(vbos, housingUnits);
      if (!usage) continue;

      const mainVbo = [...vbos].sort(
        (a, b) => Number(b.oppervlakte ?? 0) - Number(a.oppervlakte ?? 0),
      )[0];
      const livingArea = Math.max(
        15,
        Math.round(vbos.reduce((s, v) => s + Number(v.oppervlakte ?? 0), 0)),
      );
      const footprint = Math.round(pand.geom.areaM2);
      const floors = Math.max(1, Math.min(25, Math.round(livingArea / (footprint * 0.85))));
      const year = pand.year;
      const era = eraDefaults(year, usage);

      const [lng, lat] = toWgs84([pand.geom.cx, pand.geom.cy]);
      if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) {
        outOfBounds++;
        continue;
      }

      // Envelope archetypes (modelled; BAG WFS carries no envelope data).
      const roofType =
        usage === 'residential_collective' && year >= 1946 ? 'terrasse' : 'inclinee';
      const wallMaterial =
        year < 1990 ? 'brique' : usage === 'residential_collective' ? 'beton' : 'brique';
      const glazingRatio =
        Math.round(
          Math.min(0.4, Math.max(0.08, era.glazingRatio + (hash01(pandId, 'glass') - 0.5) * 0.06)) * 100,
        ) / 100;
      const solarProtection =
        hash01(pandId, 'zonwering') < (usage === 'residential_individual' ? 0.12 : 0.08);
      const inertia = wallMaterial === 'brique' ? 'moyenne' : 'lourde';

      // Modelled retrofit share: a large part of the pre-1992 Dutch stock has
      // been upgraded since construction (spouwmuur insulation, HR glazing),
      // so bouwjaar alone overstates consumption. ~60% of pre-1992 homes get
      // a standard retrofit package (documented estimate, deterministic).
      let wallInsulation = era.insul;
      let glazingType = era.glazing;
      let uWall = era.uWall;
      const retrofitted = year < 1992 && hash01(pandId, 'retrofit') < 0.6;
      if (retrofitted) {
        wallInsulation = 'iti';
        glazingType = 'double';
        uWall = Math.min(uWall, 1.0);
      }

      const heating = modelHeating(year, usage, pandId);
      const ventilation = modelVentilation(year);
      const pvRoll = hash01(pandId, 'pv');
      const pvSurfaceM2 =
        year >= 2015
          ? pvRoll < 0.45
            ? Math.round(usage === 'residential_collective' ? 20 + pvRoll * 80 : 12 + pvRoll * 40)
            : 0
          : pvRoll < 0.06
            ? Math.round(8 + pvRoll * 100)
            : 0;
      const cooling =
        usage.startsWith('tertiary') && year >= 2000 && hash01(pandId, 'cool') < 0.3
          ? 'pac_air_air'
          : year >= 2018 && hash01(pandId, 'cool') < 0.03
            ? 'pac_air_air'
            : null;

      // ESTIMATED energielabel (see header: EP-online needs an API key).
      let ep = usage === 'residential_individual' ? era.epI : era.epC;
      if (usage.startsWith('tertiary')) ep = era.epC * 1.1;
      if (retrofitted) ep *= 0.78; // insulation + glazing upgrade
      if (heating.energy === 'pac') ep *= 0.55;
      else if (heating.energy === 'reseau_chaleur') ep *= 0.9;
      ep *= 0.92 + hash01(pandId, 'ep') * 0.16;
      ep = Math.round(ep * 10) / 10;
      const ges = Math.round(ep * (GES_FACTOR[heating.energy] ?? 0.1) * 10) / 10;
      const label = labelFrom(ep, EP_THRESHOLDS);
      const gesLabel = labelFrom(ges, GES_THRESHOLDS);

      const annualConsumption = Math.round(ep * livingArea);
      buildings.push({
        id: '', // assigned after the full list is built
        nationalDbId: pandId, // BAG pand identificatie
        registryId: mainVbo.identificatie ?? '', // BAG verblijfsobject identificatie
        address: formatAddress(mainVbo),
        city: mainVbo.woonplaats ?? city.name,
        postcode: mainVbo.postcode ?? '',
        department: city.province,
        lat: Math.round(lat * 1e6) / 1e6,
        lng: Math.round(lng * 1e6) / 1e6,
        usage,
        constructionYear: year,
        footprintAreaM2: footprint,
        floors,
        heightM: Math.round(floors * 3.1 * 10) / 10,
        livingAreaM2: livingArea,
        housingUnits,
        envelope: {
          wallMaterial,
          wallInsulation,
          uWall,
          roofType,
          uRoof: era.uRoof,
          uFloor: era.uFloor,
          glazingRatio,
          glazingType,
          solarProtection,
          inertia,
        },
        systems: {
          heating,
          heatingSecondary: null,
          dhw: modelDhw(heating),
          cooling,
          ventilation,
          hasCeilingFans: false,
          pvSurfaceM2,
        },
        certificate: { label, ep, ges, gesLabel },
        comfort: modelComfort({
          inertia,
          glazingRatio,
          solarProtection,
          roofType,
          constructionYear: year,
        }),
        annualConsumptionKwhEp: annualConsumption,
        annualGesKgCo2: Math.round(ges * livingArea),
        // Blended Dutch household energy price ~0.25 EUR/kWh (2024-2025).
        annualEnergyCostEur: Math.round(annualConsumption * 0.25),
      });
      kept++;
    }
    console.log(`${city.name}: kept ${kept} buildings (quota ${CITY_QUOTA})`);
  }

  const droppedPct = (outOfBounds / Math.max(1, buildings.length + outOfBounds)) * 100;
  console.log(`Out-of-bounds points dropped: ${outOfBounds} (${droppedPct.toFixed(3)}%)`);
  if (droppedPct > 1) {
    console.error('FATAL: more than 1% of buildings outside Dutch bounds, CRS problem? Aborting.');
    process.exit(1);
  }
  if (buildings.length < CITIES.length * CITY_QUOTA * 0.8) {
    console.error(`FATAL: only ${buildings.length} buildings collected, check WFS availability.`);
    process.exit(1);
  }

  buildings.forEach((b, i) => { b.id = `bld-nl-${String(i + 1).padStart(5, '0')}`; });
  fs.writeFileSync(OUT_FILE, JSON.stringify(buildings));

  const perLabel = Object.fromEntries(LABELS.map((l) => [l, 0]));
  const perCity = new Map();
  for (const b of buildings) {
    perLabel[b.certificate.label]++;
    perCity.set(b.city, (perCity.get(b.city) ?? 0) + 1);
  }
  console.log('\n=== NL INGEST SUMMARY ===');
  console.log(`Buildings written : ${buildings.length} (${(fs.statSync(OUT_FILE).size / 1e6).toFixed(1)} MB)`);
  console.log('Label distribution (ESTIMATED, modelled from bouwjaar):', perLabel);
  console.log('Per city:');
  [...perCity.entries()].sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((err) => { console.error(err); process.exit(1); });
