/**
 * Renovativ AI Map — deterministic US building stock sample generator (usa branch).
 *
 * Usage: node scripts/generate-buildings-us.mjs
 * Output: src/data/buildings-us.json (compact) conforming to the Building
 *         interface in src/types/index.ts.
 *
 * The certificate `ep` field carries a HERS-style index score (100 = 2006 IECC
 * reference new home, 0 = net zero, typical existing homes 120 to 150), banded
 * A..G exactly like src/engine/dpe.ts (A <= 55 ... G > 130).
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
// Cities — real center coordinates, ZIP codes, states, climate profile.
// hdd: relative heating severity (Chicago ~1.25, Miami ~0.1).
// summer: base degree-hours of overheating before envelope modulation.
// coolProb: probability of central AC.
// region: drives the heating fuel mix (DOE climate regions).
// ---------------------------------------------------------------------------

const CITIES = [
  { name: 'New York', lat: 40.7128, lng: -74.0060, dept: 'New York (NY)', hdd: 1.0, summer: 900, coolProb: 0.7, region: 'north', count: 170,
    postcodes: ['10001','10002','10003','10009','10011','10016','10021','10025','10027','10029','10031','11201','11206','11211','11215','11217'],
    streets: ['Broadway', '5th Avenue', 'Park Avenue', 'Bleecker Street', 'Amsterdam Avenue', 'Bedford Avenue', 'Riverside Drive', 'Lexington Avenue', 'Hudson Street', 'Flatbush Avenue', 'West End Avenue', 'Atlantic Avenue'] },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, dept: 'California (CA)', hdd: 0.35, summer: 1100, coolProb: 0.8, region: 'la', count: 155,
    postcodes: ['90001','90004','90006','90011','90012','90015','90017','90026','90027','90036','90045','90064'],
    streets: ['Sunset Boulevard', 'Hollywood Boulevard', 'Wilshire Boulevard', 'Melrose Avenue', 'Vermont Avenue', 'Figueroa Street', 'Santa Monica Boulevard', 'Ventura Boulevard', 'Olympic Boulevard', 'Echo Park Avenue', 'Highland Avenue', 'La Brea Avenue'] },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298, dept: 'Illinois (IL)', hdd: 1.25, summer: 650, coolProb: 0.75, region: 'north', count: 145,
    postcodes: ['60601','60605','60607','60608','60611','60614','60616','60622','60626','60647'],
    streets: ['Michigan Avenue', 'State Street', 'Wacker Drive', 'Division Street', 'Milwaukee Avenue', 'Clark Street', 'Damen Avenue', 'Halsted Street', 'Lincoln Avenue', 'Roosevelt Road', 'Ashland Avenue', 'Belmont Avenue'] },
  { name: 'Houston', lat: 29.7604, lng: -95.3698, dept: 'Texas (TX)', hdd: 0.35, summer: 2400, coolProb: 0.95, region: 'south', count: 135,
    postcodes: ['77002','77003','77004','77005','77006','77007','77008','77009','77019','77030'],
    streets: ['Main Street', 'Westheimer Road', 'Montrose Boulevard', 'Richmond Avenue', 'Bissonnet Street', 'Heights Boulevard', 'Shepherd Drive', 'Kirby Drive', 'Navigation Boulevard', 'Washington Avenue', 'Yale Street', 'Studewood Street'] },
  { name: 'Phoenix', lat: 33.4484, lng: -112.0740, dept: 'Arizona (AZ)', hdd: 0.3, summer: 2800, coolProb: 0.97, region: 'south', count: 125,
    postcodes: ['85003','85004','85006','85007','85008','85012','85014','85015','85016','85018'],
    streets: ['Central Avenue', 'Camelback Road', 'Indian School Road', 'McDowell Road', 'Thomas Road', '7th Avenue', '7th Street', 'Van Buren Street', 'Grand Avenue', 'Bethany Home Road', 'Roosevelt Street', 'Encanto Boulevard'] },
  { name: 'Philadelphia', lat: 39.9526, lng: -75.1652, dept: 'Pennsylvania (PA)', hdd: 1.0, summer: 950, coolProb: 0.7, region: 'north', count: 115,
    postcodes: ['19102','19103','19104','19106','19107','19121','19123','19125','19130','19146'],
    streets: ['Market Street', 'Chestnut Street', 'Walnut Street', 'Broad Street', 'South Street', 'Girard Avenue', 'Spring Garden Street', 'Baltimore Avenue', 'Frankford Avenue', 'Passyunk Avenue', 'Pine Street', 'Spruce Street'] },
  { name: 'Dallas', lat: 32.7767, lng: -96.7970, dept: 'Texas (TX)', hdd: 0.5, summer: 2300, coolProb: 0.95, region: 'south', count: 125,
    postcodes: ['75201','75204','75205','75206','75208','75209','75214','75219','75223','75230'],
    streets: ['Main Street', 'Elm Street', 'Commerce Street', 'McKinney Avenue', 'Greenville Avenue', 'Henderson Avenue', 'Jefferson Boulevard', 'Ross Avenue', 'Maple Avenue', 'Lovers Lane', 'Gaston Avenue', 'Swiss Avenue'] },
  { name: 'Miami', lat: 25.7617, lng: -80.1918, dept: 'Florida (FL)', hdd: 0.1, summer: 2200, coolProb: 0.97, region: 'south', count: 115,
    postcodes: ['33101','33109','33125','33127','33129','33130','33131','33132','33133','33136'],
    streets: ['Biscayne Boulevard', 'Ocean Drive', 'Collins Avenue', 'Flagler Street', 'Calle Ocho', 'Brickell Avenue', 'Coral Way', 'Washington Avenue', 'Alton Road', 'NE 2nd Avenue', 'Coconut Grove Avenue', 'Bayshore Drive'] },
  { name: 'Atlanta', lat: 33.7490, lng: -84.3880, dept: 'Georgia (GA)', hdd: 0.6, summer: 1400, coolProb: 0.9, region: 'south', count: 115,
    postcodes: ['30303','30305','30306','30307','30308','30309','30312','30315','30318','30324'],
    streets: ['Peachtree Street', 'Ponce de Leon Avenue', 'North Avenue', 'Edgewood Avenue', 'Moreland Avenue', 'Piedmont Avenue', 'Marietta Street', 'Auburn Avenue', 'Howell Mill Road', 'Virginia Avenue', 'Euclid Avenue', 'Highland Avenue'] },
  { name: 'Denver', lat: 39.7392, lng: -104.9903, dept: 'Colorado (CO)', hdd: 1.15, summer: 600, coolProb: 0.6, region: 'north', count: 105,
    postcodes: ['80202','80203','80204','80205','80206','80209','80210','80211','80218','80220'],
    streets: ['Colfax Avenue', 'Broadway', 'Speer Boulevard', 'Federal Boulevard', 'Colorado Boulevard', '16th Street', 'Larimer Street', 'Downing Street', 'Alameda Avenue', 'Evans Avenue', 'Tennyson Street', 'South Pearl Street'] },
  { name: 'Seattle', lat: 47.6062, lng: -122.3321, dept: 'Washington (WA)', hdd: 0.95, summer: 400, coolProb: 0.35, region: 'pacific', count: 105,
    postcodes: ['98101','98102','98103','98104','98105','98107','98109','98112','98115','98122'],
    streets: ['Pike Street', 'Pine Street', 'Broadway', 'Rainier Avenue', 'Aurora Avenue', 'Fremont Avenue', 'Ballard Avenue', 'Queen Anne Avenue', 'Madison Street', '15th Avenue', 'Greenwood Avenue', 'California Avenue'] },
  { name: 'Boston', lat: 42.3601, lng: -71.0589, dept: 'Massachusetts (MA)', hdd: 1.1, summer: 450, coolProb: 0.55, region: 'north', count: 105,
    postcodes: ['02108','02109','02110','02111','02113','02114','02115','02116','02118','02127'],
    streets: ['Beacon Street', 'Commonwealth Avenue', 'Newbury Street', 'Tremont Street', 'Boylston Street', 'Washington Street', 'Blue Hill Avenue', 'Centre Street', 'Cambridge Street', 'Hanover Street', 'Columbus Avenue', 'Massachusetts Avenue'] },
];

// ---------------------------------------------------------------------------
// Era definitions — US building stock periods
// ---------------------------------------------------------------------------

const ERAS = [
  { key: 'pre_1950',   min: 1880, max: 1949, weight: 0.16 },
  { key: '1950_1980',  min: 1950, max: 1979, weight: 0.32 },
  { key: '1980_2000',  min: 1980, max: 2000, weight: 0.28 },
  { key: 'post_2000',  min: 2001, max: 2023, weight: 0.24 },
];

function pickEra() {
  const keys = ERAS.map((e) => [e, e.weight]);
  return pickWeighted(keys);
}

// ---------------------------------------------------------------------------
// Envelope model by era — wood-frame dominant US stock
// ---------------------------------------------------------------------------

function buildEnvelope(era, usage, city) {
  const renovated =
    era.key === 'pre_1950' ? rand() < 0.28 :
    era.key === '1950_1980' ? rand() < 0.2 : false;
  let wallMaterial, wallInsulation, uWall, uRoof, uFloor, glazingType, inertia;

  const south = city.region === 'south' || city.region === 'la';

  switch (era.key) {
    case 'pre_1950':
      // Brick rowhouses in the Northeast, wood frame elsewhere.
      wallMaterial =
        usage.startsWith('tertiary') ? 'beton' :
        city.region === 'north' ? pick(['brique', 'brique', 'bois', 'bois']) :
        pick(['bois', 'bois', 'bois', 'brique']);
      wallInsulation = renovated ? 'iti' : 'aucune';
      uWall = renovated ? rRange(0.4, 0.6) : wallMaterial === 'bois' ? rRange(1.8, 2.4) : rRange(2.0, 2.6);
      uRoof = renovated ? rRange(0.25, 0.4) : rRange(1.6, 2.6);
      uFloor = rRange(1.2, 1.8);
      glazingType = renovated ? 'double_renouvele' : 'simple';
      inertia = wallMaterial === 'bois' ? 'legere' : 'moyenne';
      break;
    case '1950_1980':
      // Ranch homes and post-war suburbs: wood frame, brick veneer, block in the South.
      wallMaterial =
        usage.startsWith('tertiary') ? pick(['beton', 'parpaing']) :
        south ? pick(['bois', 'bois', 'parpaing', 'brique']) :
        pick(['bois', 'bois', 'bois', 'brique']);
      wallInsulation = renovated ? pick(['iti', 'ite']) : 'aucune';
      uWall = renovated ? rRange(0.4, 0.6) : rRange(1.0, 1.7);
      uRoof = renovated ? rRange(0.25, 0.4) : rRange(0.8, 1.5);
      uFloor = rRange(0.9, 1.5);
      glazingType = renovated ? 'double_renouvele' : pick(['simple', 'simple', 'double']);
      inertia = wallMaterial === 'bois' ? 'legere' : 'moyenne';
      break;
    case '1980_2000':
      wallMaterial =
        usage.startsWith('tertiary') ? pick(['beton', 'parpaing']) :
        south ? pick(['bois', 'parpaing', 'brique']) : pick(['bois', 'bois', 'brique']);
      wallInsulation = 'iti'; // cavity batts from the factory
      uWall = rRange(0.5, 0.9);
      uRoof = rRange(0.35, 0.6);
      uFloor = rRange(0.7, 1.1);
      glazingType = 'double';
      inertia = wallMaterial === 'bois' ? 'legere' : 'moyenne';
      break;
    case 'post_2000':
      wallMaterial =
        usage.startsWith('tertiary') ? pick(['beton', 'parpaing']) :
        south ? pick(['bois', 'parpaing']) : pick(['bois', 'bois', 'brique']);
      wallInsulation = pick(['iti', 'iti', 'ite']);
      uWall = rRange(0.3, 0.5);
      uRoof = rRange(0.2, 0.35);
      uFloor = rRange(0.4, 0.7);
      glazingType = pick(['double', 'double', 'double_renouvele']);
      inertia = wallMaterial === 'bois' ? 'legere' : 'moyenne';
      break;
  }

  const roofType =
    usage === 'residential_individual' ? 'inclinee' :
    usage === 'residential_collective' ? pick(['terrasse', 'inclinee', 'inclinee']) :
    pick(['terrasse', 'terrasse', 'inclinee']);

  const glazingRatio =
    usage === 'tertiary_office' ? rRange(0.25, 0.55) :
    era.key === 'pre_1950' ? rRange(0.12, 0.2) :
    era.key === 'post_2000' ? rRange(0.18, 0.3) : rRange(0.15, 0.28);

  // Exterior shading (solar screens, awnings, deep porches): more common in the
  // South and Southwest, rarer in the North where shutters are decorative.
  const baseP = south ? 0.3 : 0.12;
  const eraBonus = era.key === 'post_2000' ? 0.1 : era.key === '1980_2000' ? 0.05 : 0;
  const solarProtection = rand() < baseP + eraBonus;

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
// Systems model by era and region
// ---------------------------------------------------------------------------

// Carbon factors, kgCO2 per kWh purchased (US grid average ~0.35).
const ENERGY_GES_FACTOR = { gaz_naturel: 0.2, fioul: 0.27, electricite: 0.35, reseau_chaleur: 0.2, bois: 0.03, pac: 0.35 };

function heatingForEra(era, region) {
  switch (region) {
    case 'north':
      switch (era.key) {
        case 'pre_1950':  return pickWeighted([['gaz_naturel', 0.5], ['fioul', 0.3], ['electricite', 0.15], ['bois', 0.05]]);
        case '1950_1980': return pickWeighted([['gaz_naturel', 0.6], ['fioul', 0.2], ['electricite', 0.15], ['pac', 0.05]]);
        case '1980_2000': return pickWeighted([['gaz_naturel', 0.65], ['electricite', 0.2], ['pac', 0.1], ['fioul', 0.05]]);
        case 'post_2000': return pickWeighted([['gaz_naturel', 0.55], ['pac', 0.3], ['electricite', 0.15]]);
      }
      break;
    case 'south':
      switch (era.key) {
        case 'pre_1950':  return pickWeighted([['electricite', 0.45], ['gaz_naturel', 0.4], ['bois', 0.1], ['fioul', 0.05]]);
        case '1950_1980': return pickWeighted([['electricite', 0.5], ['gaz_naturel', 0.35], ['pac', 0.15]]);
        case '1980_2000': return pickWeighted([['pac', 0.4], ['electricite', 0.35], ['gaz_naturel', 0.25]]);
        case 'post_2000': return pickWeighted([['pac', 0.5], ['electricite', 0.3], ['gaz_naturel', 0.2]]);
      }
      break;
    case 'pacific':
      switch (era.key) {
        case 'pre_1950':  return pickWeighted([['fioul', 0.35], ['electricite', 0.35], ['gaz_naturel', 0.2], ['bois', 0.1]]);
        case '1950_1980': return pickWeighted([['electricite', 0.5], ['gaz_naturel', 0.3], ['fioul', 0.15], ['bois', 0.05]]);
        case '1980_2000': return pickWeighted([['electricite', 0.45], ['gaz_naturel', 0.35], ['pac', 0.2]]);
        case 'post_2000': return pickWeighted([['pac', 0.45], ['electricite', 0.3], ['gaz_naturel', 0.25]]);
      }
      break;
    case 'la':
      switch (era.key) {
        case 'pre_1950':  return pickWeighted([['gaz_naturel', 0.6], ['electricite', 0.3], ['bois', 0.1]]);
        case '1950_1980': return pickWeighted([['gaz_naturel', 0.65], ['electricite', 0.3], ['pac', 0.05]]);
        case '1980_2000': return pickWeighted([['gaz_naturel', 0.55], ['electricite', 0.25], ['pac', 0.2]]);
        case 'post_2000': return pickWeighted([['pac', 0.45], ['gaz_naturel', 0.35], ['electricite', 0.2]]);
      }
      break;
  }
}

const HEATING_KIND = {
  gaz_naturel: ['gas_furnace', 'gas_furnace_condensing'],
  fioul: ['oil_boiler'],
  electricite: ['electric_baseboard', 'electric_furnace'],
  reseau_chaleur: ['district_steam'],
  bois: ['wood_stove'],
  pac: ['heat_pump_ducted', 'mini_split'],
};

function systemEfficiency(energy, kind, era) {
  if (energy === 'pac') return rRange(2.6, 3.4); // HSPF-style seasonal performance
  if (energy === 'electricite') return 1.0;
  if (energy === 'bois') return rRange(0.65, 0.8);
  if (energy === 'reseau_chaleur') return rRange(0.8, 0.9);
  if (kind === 'gas_furnace_condensing') return rRange(0.9, 0.97);
  if (energy === 'gaz_naturel') return era.key === 'pre_1950' || era.key === '1950_1980' ? rRange(0.65, 0.78) : rRange(0.78, 0.88);
  if (energy === 'fioul') return rRange(0.68, 0.8);
  return 0.85;
}

function buildSystems(era, usage, city) {
  const heatingEnergy = heatingForEra(era, city.region);
  const heatingKind = pick(HEATING_KIND[heatingEnergy]);
  const heatingEff = systemEfficiency(heatingEnergy, heatingKind, era);

  const maxAge = Math.max(2, 2025 - era.min - 2);
  const heating = { kind: heatingKind, energy: heatingEnergy, ageYears: rInt(2, Math.min(maxAge, 35)) };

  // Secondary: occasional wood stove, fireplace insert or electric space heaters
  const heatingSecondary = rand() < 0.14
    ? { kind: pick(['wood_stove', 'electric_baseboard']), energy: pick(['bois', 'electricite']), ageYears: rInt(3, 25) }
    : null;

  // DHW follows heating fuel in most cases
  const dhwEnergy = rand() < 0.65 ? heatingEnergy : pick(['electricite', 'gaz_naturel']);
  const dhwKind =
    dhwEnergy === 'electricite' ? 'electric_water_heater' :
    dhwEnergy === 'pac' ? 'heat_pump_water_heater' :
    dhwEnergy === 'gaz_naturel' ? pick(['gas_water_heater', 'tankless_gas_water_heater']) :
    dhwEnergy === 'fioul' ? 'oil_water_heater' :
    dhwEnergy === 'reseau_chaleur' ? 'district_dhw' : 'electric_water_heater';
  const dhw = { kind: dhwKind, energy: dhwEnergy, ageYears: rInt(2, Math.min(maxAge, 18)) };

  // Cooling: central AC is the US norm, especially in the South. Heat pumps
  // provide cooling through the same equipment (mini-splits shown as pac_air_air).
  let cooling = null;
  const roll = rand();
  if (usage === 'tertiary_office' || usage === 'tertiary_commerce') {
    if (roll < Math.min(0.98, city.coolProb + 0.15)) cooling = 'climatisation_centralisee';
  } else if (heatingKind === 'mini_split') {
    if (roll < 0.9) cooling = 'pac_air_air';
  } else if (roll < city.coolProb) {
    cooling = 'climatisation_centralisee';
  } else if (roll < city.coolProb + 0.08) {
    cooling = 'pac_air_air'; // window or portable units
  }

  // Ventilation: US homes rely on operable windows and spot exhaust fans;
  // balanced ERV/HRV only in recent tight construction.
  const ventilation =
    era.key === 'pre_1950' ? pickWeighted([['naturelle', 0.9], ['vmc_simple_flux', 0.1]]) :
    era.key === '1950_1980' ? pickWeighted([['naturelle', 0.65], ['vmc_simple_flux', 0.35]]) :
    era.key === '1980_2000' ? pickWeighted([['vmc_simple_flux', 0.6], ['naturelle', 0.4]]) :
    pickWeighted([['vmc_simple_flux', 0.7], ['vmc_double_flux', 0.2], ['naturelle', 0.1]]);

  // Ceiling fans: very common in the South, occasional elsewhere.
  const south = city.region === 'south' || city.region === 'la';
  const hasCeilingFans = south ? rand() < 0.6 : rand() < 0.18;

  const pvSurfaceM2 =
    era.key === 'post_2000' ? (rand() < (south ? 0.3 : 0.15) ? round0(rRange(12, usage === 'residential_individual' ? 40 : 150)) : 0) :
    era.key === '1980_2000' ? (rand() < 0.06 ? round0(rRange(10, 40)) : 0) :
    rand() < 0.02 ? round0(rRange(10, 30)) : 0;

  return {
    systems: { heating, heatingSecondary, dhw, cooling, ventilation, hasCeilingFans, pvSurfaceM2 },
    heatingEff,
  };
}

// ---------------------------------------------------------------------------
// HERS-style rating model — simplified physics consistent with envelope + systems.
// Score = 100 x (modeled purchased energy / 2006 IECC reference new home),
// compressed with a power curve so the distribution matches observed HERS
// ratings (existing stock mostly 90..160, deep retrofits below 60).
// ---------------------------------------------------------------------------

const U_WINDOW = { simple: 5.5, double: 3.0, double_renouvele: 1.8, triple: 1.0 };
const VENT_TERM = { naturelle: 0.35, vmc_simple_flux: 0.25, vmc_hygro: 0.2, vmc_double_flux: 0.12 };

const EP_THRESHOLDS = [[55, 'A'], [70, 'B'], [85, 'C'], [100, 'D'], [115, 'E'], [130, 'F'], [Infinity, 'G']];
const GES_THRESHOLDS = [[8, 'A'], [15, 'B'], [25, 'C'], [40, 'D'], [60, 'E'], [90, 'F'], [Infinity, 'G']];

function labelFor(value, thresholds) {
  for (const [max, label] of thresholds) if (value <= max) return label;
  return 'G';
}
const LABEL_RANK = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6 };

function heatLossIndex(envelope, ventilation, eraPenalty) {
  const uWin = U_WINDOW[envelope.glazingType];
  return (
    envelope.uWall * 0.32 +
    envelope.uRoof * 0.18 +
    envelope.uFloor * 0.13 +
    uWin * envelope.glazingRatio * 0.6 +
    VENT_TERM[ventilation] +
    eraPenalty
  );
}

function computeCertificate(envelope, systems, heatingEff, usage, city, eraPenalty) {
  const exposure =
    usage === 'residential_individual' ? 1.3 :
    usage === 'residential_collective' ? 0.95 : 1.1;

  const solarFactor = envelope.solarProtection ? 1.0 : 1.25;
  const glazingFactor = 0.75 + envelope.glazingRatio;

  // Modeled purchased energy, kWh/m2/yr
  const H = heatLossIndex(envelope, systems.ventilation, eraPenalty);
  const heatingFinal = (H * 70 * city.hdd * exposure) / heatingEff;
  const coolingFinal = systems.cooling
    ? (city.summer * 0.006 * solarFactor * glazingFactor) / 2.8
    : 0;
  const dhwBase = usage === 'tertiary_office' || usage === 'tertiary_commerce' ? 10 : usage === 'tertiary_school' ? 7 : 30;
  const dhwEff = systems.dhw.energy === 'pac' ? 2.6 : systems.dhw.energy === 'electricite' ? 1.0 : 0.85;
  const dhwFinal = dhwBase / dhwEff;
  const auxFinal = usage.startsWith('tertiary') ? 35 : 25;
  const totalFinal = heatingFinal + coolingFinal + dhwFinal + auxFinal;

  // 2006 IECC reference new home, same geometry and climate
  const hRef =
    0.45 * 0.32 + 0.25 * 0.18 + 0.5 * 0.13 + 3.0 * 0.18 * 0.6 + VENT_TERM.vmc_simple_flux;
  const heatingRef = (hRef * 70 * city.hdd * exposure) / 0.8;
  const coolingRef = (city.summer * 0.006 * 1.0 * 0.93) / 2.8;
  const dhwRef = dhwBase / 0.85;
  const totalRef = heatingRef + coolingRef + dhwRef + auxFinal;

  const ratio = totalFinal / totalRef;
  const ep = Math.max(25, Math.min(210, round0(100 * Math.pow(ratio, 0.45) * rRange(0.94, 1.06))));

  // GES, kgCO2/m2/yr from purchased energy by fuel
  const heatEnergy = systems.heating.energy;
  const gesHeating = heatingFinal * ENERGY_GES_FACTOR[heatEnergy];
  const gesDhw = dhwFinal * ENERGY_GES_FACTOR[systems.dhw.energy];
  const gesAux = auxFinal * ENERGY_GES_FACTOR.electricite;
  const gesCooling = coolingFinal * ENERGY_GES_FACTOR.electricite;
  const pvCredit = systems.pvSurfaceM2 > 0 ? Math.min(systems.pvSurfaceM2 * 0.35, 8) : 0;
  const ges = Math.max(1, round0(gesHeating + gesDhw + gesAux + gesCooling - pvCredit));

  const epLabel = labelFor(ep, EP_THRESHOLDS);
  const gesLabel = labelFor(ges, GES_THRESHOLDS);
  const label = LABEL_RANK[gesLabel] > LABEL_RANK[epLabel] ? gesLabel : epLabel;

  return { label, ep, ges, gesLabel, totalFinalPerM2: totalFinal };
}

// ---------------------------------------------------------------------------
// Summer comfort — degree-hours of overheating (without air conditioning)
// ---------------------------------------------------------------------------

function computeComfort(envelope, city) {
  const inertiaFactor = envelope.inertia === 'legere' ? 1.3 : envelope.inertia === 'lourde' ? 0.8 : 1.0;
  const solarFactor = envelope.solarProtection ? 1.0 : 1.25;
  const glazingFactor = 0.75 + envelope.glazingRatio;

  const dh2025 = round0(city.summer * inertiaFactor * solarFactor * glazingFactor * rRange(0.85, 1.15));
  const dh2050 = round0(dh2025 * 1.4 * rRange(0.95, 1.05));
  const dh2100 = round0(dh2025 * 2.0 * rRange(0.92, 1.08));
  return { dh2025, dh2050, dh2100 };
}

// ---------------------------------------------------------------------------
// Geometry & identity — US homes are larger than French ones
// ---------------------------------------------------------------------------

function buildGeometry(usage) {
  let floors, footprint;
  switch (usage) {
    case 'residential_collective':
      floors = rInt(2, 8);
      footprint = rRange(200, 800);
      break;
    case 'residential_individual':
      floors = rInt(1, 2);
      footprint = rRange(90, 220);
      break;
    case 'tertiary_office':
      floors = rInt(2, 12);
      footprint = rRange(300, 1800);
      break;
    case 'tertiary_school':
      floors = rInt(1, 3);
      footprint = rRange(500, 1500);
      break;
    case 'tertiary_commerce':
      floors = rInt(1, 3);
      footprint = rRange(200, 1000);
      break;
  }
  const livingArea = round0(footprint * floors * (usage === 'residential_individual' ? 0.9 : 0.85));
  const housingUnits =
    usage === 'residential_collective' ? Math.max(2, round0(livingArea / 85)) :
    usage === 'residential_individual' ? 1 : 0;
  return {
    footprintAreaM2: round0(footprint),
    floors,
    heightM: round(floors * 3.1, 1),
    livingAreaM2: livingArea,
    housingUnits,
  };
}

const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function registryId() {
  let s = '';
  for (let i = 0; i < 12; i++) s += ID_CHARS[Math.floor(rand() * ID_CHARS.length)];
  return s;
}

function makeAddress(city) {
  return `${rInt(10, 9899)} ${pick(city.streets)}`;
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
        ['residential_individual', 0.55],
        ['residential_collective', 0.25],
        ['tertiary_office', 0.08],
        ['tertiary_school', 0.05],
        ['tertiary_commerce', 0.07],
      ]);

      const envelope = buildEnvelope(era, usage, city);
      const { systems, heatingEff } = buildSystems(era, usage, city);
      const geometry = buildGeometry(usage);
      const eraPenalty =
        era.key === 'pre_1950' ? 0.45 :
        era.key === '1950_1980' ? 0.25 :
        era.key === '1980_2000' ? 0.05 : 0;
      const certificate = computeCertificate(envelope, systems, heatingEff, usage, city, eraPenalty);
      const comfort = computeComfort(envelope, city);

      let nationalDbId;
      do {
        nationalDbId = `US-RESNET-${String(rInt(1000000, 9999999))}`;
      } while (usedIds.has(nationalDbId));
      usedIds.add(nationalDbId);

      const annualConsumptionKwhEp = round0(certificate.totalFinalPerM2 * geometry.livingAreaM2);
      const annualGesKgCo2 = round0(certificate.ges * geometry.livingAreaM2);
      const annualEnergyCostEur = round0(annualConsumptionKwhEp * rRange(0.15, 0.17)); // USD on this branch

      buildings.push({
        id: `bld-${String(seq).padStart(5, '0')}`,
        nationalDbId,
        registryId: registryId(),
        address: makeAddress(city),
        city: city.name,
        postcode: pick(city.postcodes),
        department: city.dept,
        lat: round(city.lat + rRange(-0.05, 0.05), 6),
        lng: round(city.lng + rRange(-0.05, 0.05), 6),
        usage,
        constructionYear: rInt(era.min, era.max),
        ...geometry,
        envelope,
        systems,
        certificate: { label: certificate.label, ep: certificate.ep, ges: certificate.ges, gesLabel: certificate.gesLabel },
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

  const outPath = fileURLToPath(new URL('../src/data/buildings-us.json', import.meta.url));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(buildings), 'utf8');

  const sizeBytes = statSync(outPath).size;

  const perLabel = {};
  const perGesLabel = {};
  const perCity = {};
  const perEra = {};
  const perUsage = {};
  let epSum = 0;
  let coolingCount = 0;
  for (const b of buildings) {
    perLabel[b.certificate.label] = (perLabel[b.certificate.label] || 0) + 1;
    perGesLabel[b.certificate.gesLabel] = (perGesLabel[b.certificate.gesLabel] || 0) + 1;
    perCity[b.city] = (perCity[b.city] || 0) + 1;
    perUsage[b.usage] = (perUsage[b.usage] || 0) + 1;
    const eraKey =
      b.constructionYear <= 1949 ? 'pre-1950' :
      b.constructionYear <= 1979 ? '1950-1980' :
      b.constructionYear <= 2000 ? '1980-2000' : 'post-2000';
    perEra[eraKey] = (perEra[eraKey] || 0) + 1;
    epSum += b.certificate.ep;
    if (b.systems.cooling) coolingCount += 1;
  }

  const n = buildings.length;
  console.log(`Generated ${n} buildings -> ${outPath}`);
  console.log(`File size: ${(sizeBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Mean HERS-style score: ${(epSum / n).toFixed(0)}`);
  console.log(`Buildings with cooling: ${coolingCount} (${((100 * coolingCount) / n).toFixed(1)}%)`);
  console.log('\nLabel distribution (final):');
  for (const label of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
    const c = perLabel[label] || 0;
    console.log(`  ${label}: ${c} (${((100 * c) / n).toFixed(1)}%)`);
  }
  console.log('\nGES label distribution:');
  for (const label of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
    const c = perGesLabel[label] || 0;
    console.log(`  ${label}: ${c} (${((100 * c) / n).toFixed(1)}%)`);
  }
  console.log('\nEra distribution:');
  for (const [era, c] of Object.entries(perEra)) {
    console.log(`  ${era}: ${c} (${((100 * c) / n).toFixed(1)}%)`);
  }
  console.log('\nUsage distribution:');
  for (const [u, c] of Object.entries(perUsage)) {
    console.log(`  ${u}: ${c} (${((100 * c) / n).toFixed(1)}%)`);
  }
  console.log('\nPer-city count:');
  for (const city of CITIES) {
    console.log(`  ${city.name}: ${perCity[city.name] || 0}`);
  }
}

main();
