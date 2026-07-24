/**
 * Renovativ AI Map — deterministic UK sample dataset generator.
 *
 * Usage: node scripts/generate-buildings-uk.mjs
 * Output: src/data/buildings-uk.json (compact) conforming to
 *         the Building interface in src/types/index.ts.
 *
 * Fully deterministic: seeded mulberry32 PRNG, no Date / Math.random.
 */

import { writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// PRNG — mulberry32, fixed seed for reproducible builds
// ---------------------------------------------------------------------------

const SEED = 20260725;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);

const r01 = () => rand();
const rRange = (min, max) => min + rand() * (max - min);
const rInt = (min, max) => Math.floor(rRange(min, max + 1)); // inclusive
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickWeighted = (pairs) => {
  let total = 0;
  for (const [, w] of pairs) total += w;
  let roll = rand() * total;
  for (const [value, w] of pairs) {
    roll -= w;
    if (roll <= 0) return value;
  }
  return pairs[pairs.length - 1][0];
};
const round = (x, digits = 2) => {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
};
const round0 = (x) => Math.round(x);

// ---------------------------------------------------------------------------
// Cities — real centre coordinates, postcodes, regions, climate profile
// ---------------------------------------------------------------------------

const CITIES = [
  { name: 'London',     lat: 51.5074, lng: -0.1278, dept: 'Greater London',   postcodes: ['SW1A 1AA','E1 6AN','N1 9GU','SE1 7PB','W1D 3QF','NW1 7HB','EC1V 2NX','SW11 1AA','N4 2JP','W12 7LH','SE15 4UA','E8 3RH'], dju: 0.90, summer: 1150, count: 280,
    streets: ['Baker Street', 'King\'s Road', 'Camden High Street', 'Stoke Newington Church Street', 'Portobello Road', 'Brixton Hill', 'Upper Street', 'Lordship Lane', 'Hackney Road', 'Fulham Palace Road', 'Holloway Road', 'Peckham Rye'] },
  { name: 'Manchester', lat: 53.4808, lng: -2.2426, dept: 'Greater Manchester', postcodes: ['M1 1AE','M2 5DB','M3 4LZ','M4 5BB','M14 4HH','M20 2SW','M8 8EP','M21 9QF'], dju: 1.05, summer: 520, count: 150,
    streets: ['Deansgate', 'Oxford Road', 'Wilmslow Road', 'Cheetham Hill Road', 'Burton Road', 'Stockport Road', 'Palatine Road', 'Bury Old Road'] },
  { name: 'Birmingham', lat: 52.4862, lng: -1.8904, dept: 'West Midlands',    postcodes: ['B1 1AA','B2 4QA','B3 3AX','B5 7SE','B13 8JL','B15 2TT','B29 6BD','B11 4NF'], dju: 1.00, summer: 760, count: 160,
    streets: ['Corporation Street', 'Hagley Road', 'Bristol Road', 'Stratford Road', 'Alcester Road', 'Lodge Road', 'Pershore Road', 'Soho Road'] },
  { name: 'Leeds',      lat: 53.8008, lng: -1.5491, dept: 'West Yorkshire',   postcodes: ['LS1 4DY','LS2 7JP','LS6 3QH','LS8 2PZ','LS11 5AD','LS4 2HD','LS27 0BY'], dju: 1.05, summer: 520, count: 120,
    streets: ['Briggate', 'Otley Road', 'Kirkstall Road', 'Roundhay Road', 'Cardigan Road', 'Beeston Road', 'Chapeltown Road'] },
  { name: 'Glasgow',    lat: 55.8642, lng: -4.2518, dept: 'Glasgow City',     postcodes: ['G1 1XQ','G2 3AL','G12 8QQ','G20 6NT','G41 2SR','G3 8SW','G31 4EB'], dju: 1.20, summer: 300, count: 130,
    streets: ['Sauchiehall Street', 'Byres Road', 'Great Western Road', 'Victoria Road', 'Dumbarton Road', 'Argyle Street', 'Pollokshaws Road'] },
  { name: 'Bristol',    lat: 51.4545, lng: -2.5879, dept: 'Bristol',          postcodes: ['BS1 4ST','BS2 8HQ','BS6 5PQ','BS7 8AA','BS9 4FG','BS3 1DB','BS16 3RQ'], dju: 0.95, summer: 820, count: 110,
    streets: ['Park Street', 'Gloucester Road', 'Whiteladies Road', 'North Street', 'Stokes Croft', 'Bedminster Parade', 'Clifton Down Road'] },
  { name: 'Liverpool',  lat: 53.4084, lng: -2.9916, dept: 'Merseyside',       postcodes: ['L1 8JQ','L2 2DP','L3 9LQ','L7 8PL','L15 4LE','L8 4RU','L17 7AA'], dju: 1.05, summer: 470, count: 110,
    streets: ['Bold Street', 'Smithdown Road', 'Aigburth Road', 'County Road', 'Penny Lane', 'Walton Road', 'Allerton Road'] },
  { name: 'Sheffield',  lat: 53.3811, lng: -1.4701, dept: 'South Yorkshire',  postcodes: ['S1 2HH','S3 7SF','S7 1TS','S10 2TN','S11 8ZE','S6 3UP','S5 6QS'], dju: 1.05, summer: 520, count: 100,
    streets: ['Ecclesall Road', 'London Road', 'Abbeydale Road', 'Hillsborough Road', 'Chesterfield Road', 'Fulwood Road', 'Queens Road'] },
  { name: 'Newcastle',  lat: 54.9783, lng: -1.6178, dept: 'Tyne and Wear',    postcodes: ['NE1 5AF','NE2 4AE','NE4 9PL','NE6 5YJ','NE7 7LX','NE3 1DB','NE12 8JD'], dju: 1.15, summer: 360, count: 100,
    streets: ['Northumberland Street', 'Jesmond Road', 'Westgate Road', 'Heaton Road', 'Chillingham Road', 'Gosforth High Street', 'Shields Road'] },
  { name: 'Edinburgh',  lat: 55.9533, lng: -3.1883, dept: 'City of Edinburgh', postcodes: ['EH1 1YZ','EH3 6QG','EH6 4BB','EH8 9YL','EH11 1DR','EH9 2JY','EH4 1BL'], dju: 1.20, summer: 270, count: 110,
    streets: ['Princes Street', 'Leith Walk', 'Morningside Road', 'Bruntsfield Place', 'Great Junction Street', 'Dalry Road', 'Portobello High Street'] },
  { name: 'Cardiff',    lat: 51.4816, lng: -3.1791, dept: 'Cardiff',          postcodes: ['CF10 1EP','CF11 9LJ','CF14 3UW','CF23 5AQ','CF24 0ED','CF5 1NB','CF3 5LT'], dju: 1.00, summer: 620, count: 100,
    streets: ['Queen Street', 'Cowbridge Road East', 'City Road', 'Whitchurch Road', 'Albany Road', 'Cathedral Road', 'Penylan Road'] },
  { name: 'Nottingham', lat: 52.9548, lng: -1.1581, dept: 'Nottinghamshire',  postcodes: ['NG1 5FS','NG2 1AA','NG5 1BP','NG7 2RD','NG9 2LA','NG3 5AJ','NG8 3BN'], dju: 1.00, summer: 660, count: 120,
    streets: ['Mansfield Road', 'Derby Road', 'Radford Road', 'Alfreton Road', 'Woodborough Road', 'Carlton Road', 'Lenton Boulevard'] },
];

// ---------------------------------------------------------------------------
// Era definitions — UK building stock periods
// ---------------------------------------------------------------------------

const ERAS = [
  { key: 'pre_1919',    min: 1850, max: 1918, weight: 0.20 }, // Victorian / Edwardian solid-wall terraces
  { key: '1919_1944',   min: 1919, max: 1944, weight: 0.18 }, // interwar cavity semis
  { key: '1945_1964',   min: 1945, max: 1964, weight: 0.17 }, // post-war estates
  { key: '1965_1980',   min: 1965, max: 1980, weight: 0.15 }, // system-built blocks, cavity
  { key: '1981_2002',   min: 1981, max: 2002, weight: 0.17 }, // filled cavity becomes common
  { key: 'post_2003',   min: 2003, max: 2024, weight: 0.13 }, // modern regulations, good U-values
];

function pickEra() {
  const keys = ERAS.map((e) => [e, e.weight]);
  return pickWeighted(keys);
}

// ---------------------------------------------------------------------------
// Envelope model by era
// ---------------------------------------------------------------------------

function buildEnvelope(era, usage) {
  let wallMaterial, wallInsulation, uWall, uRoof, uFloor, glazingType, inertia;

  switch (era.key) {
    case 'pre_1919': {
      // Solid-wall Victorian / Edwardian terraces.
      const retrofitted = rand() < 0.25;
      wallMaterial = pick(['brique', 'brique', 'brique', 'pierre']);
      wallInsulation = retrofitted ? pick(['iti', 'ite']) : 'aucune';
      uWall = retrofitted ? rRange(0.5, 0.7) : rRange(2.0, 2.1);
      uRoof = rand() < 0.4 ? rRange(0.18, 0.3) : rRange(1.9, 2.6);
      uFloor = rRange(1.0, 1.4); // suspended timber ground floor
      glazingType = retrofitted ? 'double_renouvele' : pick(['simple', 'simple', 'double']);
      inertia = pick(['moyenne', 'moyenne', 'lourde']);
      break;
    }
    case '1919_1944': {
      // Interwar cavity semis, some retrofitted with cavity fill.
      const filled = rand() < 0.45;
      wallMaterial = 'brique';
      wallInsulation = filled ? 'repartie' : 'cavite_vide';
      uWall = filled ? rRange(0.5, 0.6) : rRange(1.4, 1.6);
      uRoof = rand() < 0.4 ? rRange(0.2, 0.3) : rRange(1.7, 2.3);
      uFloor = rRange(0.9, 1.3);
      glazingType = pick(['double', 'double', 'simple']);
      inertia = 'moyenne';
      break;
    }
    case '1945_1964': {
      // Post-war estates: cavity semis and system-built blocks.
      const isBlock = usage === 'residential_collective' && rand() < 0.45;
      if (isBlock) {
        wallMaterial = 'beton';
        wallInsulation = 'aucune';
        uWall = rRange(1.7, 2.0);
      } else {
        const filled = rand() < 0.35;
        wallMaterial = 'brique';
        wallInsulation = filled ? 'repartie' : 'cavite_vide';
        uWall = filled ? rRange(0.55, 0.65) : rRange(1.3, 1.6);
      }
      uRoof = rand() < 0.35 ? rRange(0.25, 0.4) : rRange(1.3, 2.0);
      uFloor = rRange(0.9, 1.3);
      glazingType = pick(['double', 'double', 'simple']);
      inertia = wallMaterial === 'beton' ? 'lourde' : 'moyenne';
      break;
    }
    case '1965_1980': {
      const filled = rand() < 0.5;
      wallMaterial = pick(['brique', 'beton', 'beton']);
      wallInsulation = filled ? 'repartie' : 'cavite_vide';
      uWall = filled ? rRange(0.55, 0.7) : rRange(1.0, 1.3);
      uRoof = rand() < 0.45 ? rRange(0.25, 0.4) : rRange(0.8, 1.4);
      uFloor = rRange(0.8, 1.1);
      glazingType = 'double';
      inertia = wallMaterial === 'beton' ? 'lourde' : 'moyenne';
      break;
    }
    case '1981_2002': {
      wallMaterial = pick(['brique', 'brique', 'beton']);
      wallInsulation = 'repartie';
      uWall = rRange(0.45, 0.6);
      uRoof = rRange(0.3, 0.45);
      uFloor = rRange(0.6, 0.9);
      glazingType = 'double';
      inertia = 'moyenne';
      break;
    }
    case 'post_2003': {
      wallMaterial = pick(['brique', 'bois', 'beton']);
      wallInsulation = pick(['iti', 'ite']);
      uWall = rRange(0.22, 0.35);
      uRoof = rRange(0.13, 0.2);
      uFloor = rRange(0.2, 0.35);
      glazingType = pick(['double', 'double', 'triple']);
      inertia = wallMaterial === 'bois' ? 'legere' : pick(['moyenne', 'moyenne', 'legere']);
      break;
    }
  }

  const roofType = usage === 'residential_individual' ? 'inclinee' : pick(['terrasse', 'inclinee', 'inclinee']);
  const glazingRatio =
    usage === 'tertiary_office' ? rRange(0.25, 0.5) :
    era.key === 'pre_1919' ? rRange(0.12, 0.2) :
    era.key === 'post_2003' ? rRange(0.18, 0.32) : rRange(0.14, 0.28);

  // External shading is rare in the UK stock.
  const solarProtection =
    era.key === 'pre_1919' ? rand() < 0.1 :
    era.key === '1919_1944' ? rand() < 0.12 :
    era.key === '1945_1964' ? rand() < 0.14 :
    era.key === '1965_1980' ? rand() < 0.16 :
    era.key === '1981_2002' ? rand() < 0.2 : rand() < 0.3;

  return {
    wallMaterial,
    wallInsulation,
    uWall: round(uWall),
    roofType,
    uRoof: round(uRoof),
    uFloor: round(uFloor),
    glazingRatio: round(glazingRatio),
    glazingType,
    solarProtection,
    inertia,
  };
}

// ---------------------------------------------------------------------------
// Systems model by era
// ---------------------------------------------------------------------------

// UK primary energy factors (SAP-flavoured) and CO2 factors (kgCO2/kWh final).
const ENERGY_CONVERSION = { gaz_naturel: 1.13, fioul: 1.06, electricite: 1.42, reseau_chaleur: 1.2, bois: 1.05, pac: 1.42 };
const ENERGY_GES_FACTOR = { gaz_naturel: 0.184, fioul: 0.267, electricite: 0.19, reseau_chaleur: 0.17, bois: 0.02, pac: 0.19 };

function heatingForEra(era) {
  switch (era.key) {
    case 'pre_1919':
      return pickWeighted([['gaz_naturel', 0.72], ['electricite', 0.15], ['fioul', 0.05], ['bois', 0.05], ['reseau_chaleur', 0.03]]);
    case '1919_1944':
      return pickWeighted([['gaz_naturel', 0.75], ['electricite', 0.15], ['fioul', 0.05], ['bois', 0.03], ['reseau_chaleur', 0.02]]);
    case '1945_1964':
      return pickWeighted([['gaz_naturel', 0.62], ['electricite', 0.25], ['fioul', 0.05], ['reseau_chaleur', 0.05], ['bois', 0.03]]);
    case '1965_1980':
      return pickWeighted([['gaz_naturel', 0.55], ['electricite', 0.35], ['fioul', 0.04], ['reseau_chaleur', 0.06]]);
    case '1981_2002':
      return pickWeighted([['gaz_naturel', 0.78], ['electricite', 0.15], ['pac', 0.02], ['fioul', 0.03], ['reseau_chaleur', 0.02]]);
    case 'post_2003':
      return pickWeighted([['gaz_naturel', 0.68], ['electricite', 0.12], ['pac', 0.12], ['reseau_chaleur', 0.06], ['bois', 0.02]]);
  }
}

const HEATING_KIND = {
  gaz_naturel: ['gas_boiler', 'gas_combi_boiler', 'gas_combi_boiler'],
  fioul: ['oil_boiler'],
  reseau_chaleur: ['district_heat'],
  bois: ['wood_stove'],
  pac: ['ashp_air_water'],
};

function heatingKind(energy, era) {
  if (energy === 'electricite') {
    // Storage heaters concentrated in 1945-2002 flats; panel heaters elsewhere.
    const storageEra = era.key === '1945_1964' || era.key === '1965_1980' || era.key === '1981_2002';
    return storageEra ? pickWeighted([['storage_heaters', 0.7], ['panel_heaters', 0.3]]) : pickWeighted([['panel_heaters', 0.8], ['storage_heaters', 0.2]]);
  }
  return pick(HEATING_KIND[energy]);
}

function systemEfficiency(energy, kind, era) {
  if (energy === 'pac') return rRange(2.5, 3.2);
  if (energy === 'electricite') return 1.0;
  if (energy === 'bois') return rRange(0.75, 0.85);
  if (energy === 'reseau_chaleur') return rRange(0.85, 0.95);
  if (kind === 'gas_combi_boiler') return rRange(0.86, 0.92);
  if (energy === 'gaz_naturel') return era.key === 'pre_1919' || era.key === '1919_1944' || era.key === '1945_1964' ? rRange(0.68, 0.8) : rRange(0.8, 0.9);
  if (energy === 'fioul') return rRange(0.72, 0.85);
  return 0.9;
}

function buildSystems(era, usage, city) {
  const heatingEnergy = heatingForEra(era);
  const kind = heatingKind(heatingEnergy, era);
  const heatingEff = systemEfficiency(heatingEnergy, kind, era);

  const maxAge = Math.max(2, 2025 - era.min - 2);
  const heating = { kind, energy: heatingEnergy, ageYears: rInt(2, Math.min(maxAge, 35)) };

  // Secondary system: occasional open fire or plug-in heater.
  const heatingSecondary = rand() < 0.12
    ? { kind: pick(['wood_stove', 'panel_heaters']), energy: pick(['bois', 'electricite']), ageYears: rInt(3, 20) }
    : null;

  // DHW follows heating energy in most cases.
  const dhwEnergy = rand() < 0.7 ? heatingEnergy : pick(['electricite', 'gaz_naturel']);
  const dhwKind =
    dhwEnergy === 'electricite' ? 'dhw_immersion' :
    dhwEnergy === 'pac' ? 'dhw_heat_pump' :
    dhwEnergy === 'gaz_naturel' ? 'dhw_gas_boiler' :
    dhwEnergy === 'fioul' ? 'dhw_oil' :
    dhwEnergy === 'reseau_chaleur' ? 'dhw_district' : 'dhw_immersion';
  const dhw = { kind: dhwKind, energy: dhwEnergy, ageYears: rInt(2, Math.min(maxAge, 20)) };

  // Cooling: almost always absent in the UK stock.
  let cooling = null;
  if (usage === 'tertiary_office' && rand() < (city.summer >= 800 ? 0.4 : 0.2)) cooling = 'climatisation_centralisee';
  else if (rand() < 0.02) cooling = 'pac_air_air';

  const ventilation =
    era.key === 'pre_1919' ? pickWeighted([['naturelle', 0.85], ['vmc_simple_flux', 0.15]]) :
    era.key === '1919_1944' ? pickWeighted([['naturelle', 0.8], ['vmc_simple_flux', 0.2]]) :
    era.key === '1945_1964' ? pickWeighted([['naturelle', 0.6], ['vmc_simple_flux', 0.4]]) :
    era.key === '1965_1980' ? pickWeighted([['vmc_simple_flux', 0.5], ['naturelle', 0.5]]) :
    era.key === '1981_2002' ? pickWeighted([['vmc_simple_flux', 0.7], ['naturelle', 0.3]]) :
    pickWeighted([['vmc_simple_flux', 0.55], ['vmc_double_flux', 0.25], ['vmc_hygro', 0.2]]);

  const hasCeilingFans = city.summer >= 800 && rand() < 0.08;

  const pvSurfaceM2 =
    era.key === 'post_2003' ? (rand() < 0.25 ? round0(rRange(10, usage === 'residential_individual' ? 25 : 100)) : 0) :
    era.key === '1981_2002' ? (rand() < 0.08 ? round0(rRange(10, 40)) : 0) :
    rand() < 0.02 ? round0(rRange(10, 30)) : 0;

  return {
    systems: { heating, heatingSecondary, dhw, cooling, ventilation, hasCeilingFans, pvSurfaceM2 },
    heatingEff,
  };
}

// ---------------------------------------------------------------------------
// EPC model — simplified physics consistent with envelope + systems
// ---------------------------------------------------------------------------

const U_WINDOW = { simple: 5.5, double: 2.8, double_renouvele: 1.5, triple: 1.0 };
const VENT_TERM = { naturelle: 0.3, vmc_simple_flux: 0.22, vmc_hygro: 0.18, vmc_double_flux: 0.1 };

const EP_THRESHOLDS = [[45, 'A'], [90, 'B'], [140, 'C'], [190, 'D'], [260, 'E'], [340, 'F'], [Infinity, 'G']];
const GES_THRESHOLDS = [[10, 'A'], [20, 'B'], [40, 'C'], [60, 'D'], [85, 'E'], [115, 'F'], [Infinity, 'G']];

function labelFor(value, thresholds) {
  for (const [max, label] of thresholds) if (value <= max) return label;
  return 'G';
}
const LABEL_RANK = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6 };

function computeCertificate(envelope, systems, heatingEff, usage, city, eraPenalty) {
  const uWin = U_WINDOW[envelope.glazingType];
  const H =
    envelope.uWall * 0.32 +
    envelope.uRoof * 0.18 +
    envelope.uFloor * 0.13 +
    uWin * envelope.glazingRatio * 0.6 +
    VENT_TERM[systems.ventilation] +
    eraPenalty;

  const exposure =
    usage === 'residential_individual' ? 1.3 :
    usage === 'residential_collective' ? 0.95 : 1.1;

  const heatingFinalPerM2 = H * 82 * city.dju * exposure;
  const heatEnergy = systems.heating.energy;
  const heatConv = ENERGY_CONVERSION[heatEnergy];
  const heatingEpPerM2 = (heatingFinalPerM2 / heatingEff) * heatConv;
  const heatingGesPerM2 = heatingFinalPerM2 * ENERGY_GES_FACTOR[heatEnergy];

  const dhwBase = usage === 'tertiary_office' || usage === 'tertiary_commerce' ? 8 : usage === 'tertiary_school' ? 6 : 20;
  const dhwEnergy = systems.dhw.energy;
  const dhwEff = dhwEnergy === 'pac' ? 2.4 : dhwEnergy === 'electricite' ? 1.0 : 0.85;
  const dhwEpPerM2 = (dhwBase / dhwEff) * ENERGY_CONVERSION[dhwEnergy];
  const dhwGesPerM2 = dhwBase * ENERGY_GES_FACTOR[dhwEnergy];

  const auxEpPerM2 = usage.startsWith('tertiary') ? 22 : 6;
  const auxGesPerM2 = (auxEpPerM2 / 1.42) * ENERGY_GES_FACTOR.electricite;

  const coolingEpPerM2 = systems.cooling ? 8 : 0;
  const coolingGesPerM2 = (coolingEpPerM2 / 1.42) * ENERGY_GES_FACTOR.electricite;

  const ep = round0(heatingEpPerM2 + dhwEpPerM2 + auxEpPerM2 + coolingEpPerM2);
  const ges = round0(heatingGesPerM2 + dhwGesPerM2 + auxGesPerM2 + coolingGesPerM2);

  const epLabel = labelFor(ep, EP_THRESHOLDS);
  const gesLabel = labelFor(ges, GES_THRESHOLDS);
  const label = LABEL_RANK[gesLabel] > LABEL_RANK[epLabel] ? gesLabel : epLabel;

  return { label, ep, ges, gesLabel };
}

// ---------------------------------------------------------------------------
// Summer comfort — overheating degree-hours (without cooling)
// ---------------------------------------------------------------------------

function computeComfort(envelope, city) {
  const inertiaFactor = envelope.inertia === 'legere' ? 1.3 : envelope.inertia === 'lourde' ? 0.8 : 1.0;
  const solarFactor = envelope.solarProtection ? 1.0 : 1.25;
  const glazingFactor = 0.75 + envelope.glazingRatio;

  const dh2025 = round0(city.summer * inertiaFactor * solarFactor * glazingFactor * rRange(0.85, 1.15));
  const dh2050 = round0(dh2025 * 1.5 * rRange(0.95, 1.05));
  const dh2100 = round0(dh2025 * 2.2 * rRange(0.92, 1.08));
  return { dh2025, dh2050, dh2100 };
}

// ---------------------------------------------------------------------------
// Geometry & identity
// ---------------------------------------------------------------------------

function buildGeometry(usage) {
  let floors, footprint;
  switch (usage) {
    case 'residential_collective':
      floors = rInt(2, 6);
      footprint = rRange(200, 800);
      break;
    case 'residential_individual':
      floors = rInt(1, 2);
      footprint = rRange(55, 130);
      break;
    case 'tertiary_office':
      floors = rInt(2, 10);
      footprint = rRange(250, 1500);
      break;
    case 'tertiary_school':
      floors = rInt(1, 3);
      footprint = rRange(400, 1200);
      break;
    case 'tertiary_commerce':
      floors = rInt(1, 3);
      footprint = rRange(150, 800);
      break;
  }
  const livingArea = round0(footprint * floors * (usage === 'residential_individual' ? 0.9 : 0.85));
  const housingUnits =
    usage === 'residential_collective' ? Math.max(2, round0(livingArea / 65)) :
    usage === 'residential_individual' ? 1 : 0;
  return {
    footprintAreaM2: round0(footprint),
    floors,
    heightM: round(floors * 3.0, 1),
    livingAreaM2: livingArea,
    housingUnits,
  };
}

function uprn() {
  let s = '';
  for (let i = 0; i < 12; i++) s += String(rInt(0, 9));
  return s;
}

function makeAddress(city) {
  const n = rand() < 0.1 ? `${rInt(1, 140)}a` : `${rInt(1, 180)}`;
  return `${n} ${pick(city.streets)}`;
}

// ---------------------------------------------------------------------------
// Main generation loop
// ---------------------------------------------------------------------------

function generate() {
  const buildings = [];
  const usedIds = new Set();
  let seq = 0;

  for (const city of CITIES) {
    for (let i = 0; i < city.count; i++) {
      seq += 1;
      const era = pickEra();
      const usage = pickWeighted([
        ['residential_collective', 0.45],
        ['residential_individual', 0.38],
        ['tertiary_office', 0.07],
        ['tertiary_school', 0.04],
        ['tertiary_commerce', 0.06],
      ]);

      const envelope = buildEnvelope(era, usage);
      const { systems, heatingEff } = buildSystems(era, usage, city);
      const geometry = buildGeometry(usage);
      const eraPenalty =
        era.key === 'pre_1919' ? 0.5 :
        era.key === '1919_1944' ? 0.35 :
        era.key === '1945_1964' ? 0.25 :
        era.key === '1965_1980' ? 0.15 : 0;
      const certificate = computeCertificate(envelope, systems, heatingEff, usage, city, eraPenalty);
      const comfort = computeComfort(envelope, city);

      let nationalDbId;
      do {
        nationalDbId = `EPC-${String(rInt(100000000, 999999999))}`;
      } while (usedIds.has(nationalDbId));
      usedIds.add(nationalDbId);

      const annualConsumptionKwhEp = round0(certificate.ep * geometry.livingAreaM2);
      const annualGesKgCo2 = round0(certificate.ges * geometry.livingAreaM2);
      const annualEnergyCostEur = round0(annualConsumptionKwhEp * 0.15);

      buildings.push({
        id: `bld-${String(seq).padStart(5, '0')}`,
        nationalDbId,
        registryId: uprn(),
        address: makeAddress(city),
        city: city.name,
        postcode: pick(city.postcodes),
        department: city.dept,
        lat: round(city.lat + rRange(-0.04, 0.04), 6),
        lng: round(city.lng + rRange(-0.04, 0.04), 6),
        usage,
        constructionYear: rInt(era.min, era.max),
        ...geometry,
        envelope,
        systems,
        certificate,
        comfort,
        annualConsumptionKwhEp,
        annualGesKgCo2,
        annualEnergyCostEur,
      });
    }
  }

  return buildings;
}

// ---------------------------------------------------------------------------
// Output & summary
// ---------------------------------------------------------------------------

function main() {
  const buildings = generate();

  const outPath = fileURLToPath(new URL('../src/data/buildings-uk.json', import.meta.url));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(buildings), 'utf8');

  const sizeBytes = statSync(outPath).size;

  const perLabel = {};
  const perGesLabel = {};
  const perCity = {};
  const perEra = {};
  let epSum = 0;
  let coolingCount = 0;
  for (const b of buildings) {
    perLabel[b.certificate.label] = (perLabel[b.certificate.label] || 0) + 1;
    perGesLabel[b.certificate.gesLabel] = (perGesLabel[b.certificate.gesLabel] || 0) + 1;
    perCity[b.city] = (perCity[b.city] || 0) + 1;
    const eraKey =
      b.constructionYear <= 1918 ? 'pre-1919' :
      b.constructionYear <= 1944 ? '1919-1944' :
      b.constructionYear <= 1964 ? '1945-1964' :
      b.constructionYear <= 1980 ? '1965-1980' :
      b.constructionYear <= 2002 ? '1981-2002' : 'post-2003';
    perEra[eraKey] = (perEra[eraKey] || 0) + 1;
    if (b.systems.cooling) coolingCount += 1;
    epSum += b.certificate.ep;
  }

  const n = buildings.length;
  console.log(`Generated ${n} buildings -> ${outPath}`);
  console.log(`File size: ${(sizeBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Mean EP: ${(epSum / n).toFixed(0)} kWh/m2/year`);
  console.log(`Buildings with cooling: ${coolingCount} (${((100 * coolingCount) / n).toFixed(1)}%)`);
  console.log('\nEPC band distribution:');
  for (const label of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
    const c = perLabel[label] || 0;
    console.log(`  ${label}: ${c} (${((100 * c) / n).toFixed(1)}%)`);
  }
  console.log('\nEmissions band distribution:');
  for (const label of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
    const c = perGesLabel[label] || 0;
    console.log(`  ${label}: ${c} (${((100 * c) / n).toFixed(1)}%)`);
  }
  console.log('\nEra distribution:');
  for (const [era, c] of Object.entries(perEra)) {
    console.log(`  ${era}: ${c} (${((100 * c) / n).toFixed(1)}%)`);
  }
  console.log('\nPer-city count:');
  for (const city of CITIES) {
    console.log(`  ${city.name}: ${perCity[city.name] || 0}`);
  }
}

main();
