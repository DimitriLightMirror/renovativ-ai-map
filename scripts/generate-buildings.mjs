/**
 * Renovativ AI Map — deterministic BDNB-shaped sample dataset generator.
 *
 * Usage: node scripts/generate-buildings.mjs
 * Output: src/data/buildings-fr.json (compact, < 2 MB) conforming to
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

const SEED = 20260724;

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
// Cities — real center coordinates, postcodes, departments, climate profile
// ---------------------------------------------------------------------------

const CITIES = [
  { name: 'Paris',       lat: 48.8566, lng: 2.3522,  dept: 'Paris (75)',             postcodes: ['75001','75003','75005','75007','75009','75010','75011','75012','75013','75014','75015','75016','75017','75018','75019','75020'], dju: 1.00, summer: 1000, count: 140,
    streets: ['rue de Rivoli', 'boulevard Haussmann', 'rue de Rennes', 'avenue de la République', 'rue Saint-Antoine', 'rue de Vaugirard', 'boulevard Voltaire', 'rue de Belleville', 'rue Lepic', 'avenue Parmentier', 'rue de Charonne', 'boulevard Saint-Germain'] },
  { name: 'Lyon',        lat: 45.7640, lng: 4.8357,  dept: 'Rhône (69)',             postcodes: ['69001','69002','69003','69004','69005','69006','69007','69008','69009'], dju: 1.05, summer: 1300, count: 120,
    streets: ['rue de la République', 'cours Lafayette', 'rue Garibaldi', 'avenue Jean Jaurès', 'quai Saint-Antoine', 'rue de la Charité', 'montée de la Grande-Côte', 'cours Gambetta', 'rue Paul Bert', 'avenue Berthelot'] },
  { name: 'Marseille',   lat: 43.2965, lng: 5.3698,  dept: 'Bouches-du-Rhône (13)',  postcodes: ['13001','13002','13004','13005','13006','13007','13008','13009','13010','13012'], dju: 0.72, summer: 2300, count: 125,
    streets: ['la Canebière', 'rue Paradis', 'boulevard Prado', 'rue Saint-Ferréol', 'avenue du Prado', 'rue de Rome', 'corniche Kennedy', 'boulevard Baille', 'rue Breteuil', 'avenue de la Corse'] },
  { name: 'Toulouse',    lat: 43.6047, lng: 1.4442,  dept: 'Haute-Garonne (31)',     postcodes: ['31000','31100','31200','31300','31400','31500'], dju: 0.90, summer: 1800, count: 110,
    streets: ["rue d'Alsace-Lorraine", 'allées Jean Jaurès', 'rue Saint-Rome', 'boulevard de Strasbourg', 'rue de Metz', 'avenue de Muret', 'rue des Filatiers', 'boulevard Lazare Carnot'] },
  { name: 'Bordeaux',    lat: 44.8378, lng: -0.5792, dept: 'Gironde (33)',           postcodes: ['33000','33100','33200','33300','33800'], dju: 0.95, summer: 1500, count: 105,
    streets: ["cours de l'Intendance", 'rue Sainte-Catherine', 'cours Victor Hugo', 'quai des Chartrons', 'rue Judaïque', 'cours Pasteur', 'rue Fondaudège', 'cours de la Marne'] },
  { name: 'Nantes',      lat: 47.2184, lng: -1.5536, dept: 'Loire-Atlantique (44)',  postcodes: ['44000','44100','44200','44300'], dju: 1.02, summer: 800, count: 100,
    streets: ['rue Crébillon', 'cours des 50 Otages', 'quai de la Fosse', 'rue Paul Bellamy', 'boulevard Stalingrad', 'rue Fouré', 'rue de Rennes', 'chaussée de la Madeleine'] },
  { name: 'Lille',       lat: 50.6292, lng: 3.0573,  dept: 'Nord (59)',              postcodes: ['59000','59160','59260','59777','59800'], dju: 1.12, summer: 550, count: 100,
    streets: ['rue Faidherbe', 'rue Nationale', 'boulevard de la Liberté', 'rue de Béthune', 'rue Solférino', 'rue Masséna', 'boulevard Vauban', 'rue de Wazemmes'] },
  { name: 'Strasbourg',  lat: 48.5734, lng: 7.7521,  dept: 'Bas-Rhin (67)',          postcodes: ['67000','67100','67200'], dju: 1.12, summer: 850, count: 95,
    streets: ['rue des Grandes-Arcades', 'avenue des Vosges', 'quai des Bateliers', 'rue du Faubourg-de-Pierre', 'rue de la Krutenau', 'avenue de la Forêt-Noire', 'rue du Vieux-Marché-aux-Vins'] },
  { name: 'Rennes',      lat: 48.1173, lng: -1.6778, dept: 'Ille-et-Vilaine (35)',   postcodes: ['35000','35200','35700'], dju: 1.02, summer: 700, count: 95,
    streets: ['rue Le Bastard', 'quai Émile Zola', 'boulevard de la Liberté', 'rue Saint-Malo', 'rue de Fougères', 'avenue Janvier', 'rue de Vitré', 'place Sainte-Anne'] },
  { name: 'Nice',        lat: 43.7102, lng: 7.2620,  dept: 'Alpes-Maritimes (06)',   postcodes: ['06000','06100','06200','06300'], dju: 0.68, summer: 2400, count: 100,
    streets: ['promenade des Anglais', 'avenue Jean Médecin', 'rue Masséna', 'boulevard Gambetta', 'avenue de la République', 'rue Rossini', 'boulevard Raimbaldi', 'rue Gioffredo'] },
  { name: 'Montpellier', lat: 43.6108, lng: 3.8767,  dept: 'Hérault (34)',           postcodes: ['34000','34070','34080','34090'], dju: 0.80, summer: 2100, count: 100,
    streets: ['rue de la Loge', 'avenue Foch', 'grand rue Jean Moulin', 'rue de la Carbonnerie', "place de l'Europe", 'rue de Verdun', 'avenue de Lodève', 'rue des Étuves'] },
  { name: 'Grenoble',    lat: 45.1885, lng: 5.7245,  dept: 'Isère (38)',             postcodes: ['38000','38100'], dju: 1.05, summer: 1200, count: 95,
    streets: ['cours Jean Jaurès', 'rue Félix Poulat', 'boulevard Gambetta', 'cours Berriat', 'rue Lesdiguières', 'avenue Alsace-Lorraine', 'rue Bayard'] },
  { name: 'Dijon',       lat: 47.3220, lng: 5.0415,  dept: "Côte-d'Or (21)",         postcodes: ['21000'], dju: 1.05, summer: 900, count: 90,
    streets: ['rue de la Liberté', 'rue Monge', 'rue Berbisey', 'avenue Victor Hugo', 'rue Vannerie', 'boulevard de Brosses', 'rue des Forges'] },
  { name: 'Tours',       lat: 47.3941, lng: 0.6848,  dept: 'Indre-et-Loire (37)',    postcodes: ['37000','37100','37200'], dju: 1.00, summer: 900, count: 90,
    streets: ['rue Nationale', 'avenue Grammont', 'rue Colbert', 'rue Néricault-Destouches', 'rue Émile Zola', 'boulevard Béranger', 'rue de la Scellerie'] },
  { name: 'Brest',       lat: 48.3904, lng: -4.4861, dept: 'Finistère (29)',         postcodes: ['29200'], dju: 1.05, summer: 450, count: 90,
    streets: ['rue de Siam', 'rue Jean Jaurès', 'rue de Lyon', 'boulevard de l\'Europe', 'rue Victor Hugo', 'rue de la Porte', 'avenue Georges Clemenceau'] },
];

// ---------------------------------------------------------------------------
// Era definitions — French building stock periods
// ---------------------------------------------------------------------------

const ERAS = [
  { key: 'avant_1948', min: 1880, max: 1947, weight: 0.18 },
  { key: '1949_1974',  min: 1949, max: 1974, weight: 0.30 },
  { key: '1975_1988',  min: 1975, max: 1988, weight: 0.20 },
  { key: '1989_2000',  min: 1989, max: 2000, weight: 0.13 },
  { key: '2001_2012',  min: 2001, max: 2012, weight: 0.11 },
  { key: 'apres_2012', min: 2013, max: 2023, weight: 0.08 },
];

function pickEra() {
  const keys = ERAS.map((e) => [e, e.weight]);
  return pickWeighted(keys);
}

// ---------------------------------------------------------------------------
// Envelope model by era
// ---------------------------------------------------------------------------

function buildEnvelope(era, usage) {
  const renovated = era.key === 'avant_1948' ? rand() < 0.22 : era.key === '1949_1974' ? rand() < 0.16 : false;
  let wallMaterial, wallInsulation, uWall, uRoof, uFloor, glazingType, inertia;

  switch (era.key) {
    case 'avant_1948':
      wallMaterial = pick(['pierre', 'pierre', 'brique', 'pisé']);
      wallInsulation = renovated ? pick(['iti', 'ite']) : 'aucune';
      uWall = renovated ? rRange(0.3, 0.5) : rRange(2.0, 2.5);
      uRoof = renovated ? rRange(0.2, 0.3) : rRange(1.8, 2.8);
      uFloor = rRange(1.2, 1.8);
      glazingType = renovated ? 'double_renouvele' : 'simple';
      inertia = wallMaterial === 'pierre' ? 'lourde' : pick(['moyenne', 'lourde']);
      break;
    case '1949_1974':
      wallMaterial = pick(['beton', 'beton', 'brique']);
      wallInsulation = renovated ? pick(['iti', 'ite']) : 'aucune';
      uWall = renovated ? rRange(0.35, 0.55) : rRange(1.8, 2.4);
      uRoof = renovated ? rRange(0.2, 0.35) : rRange(1.5, 2.5);
      uFloor = rRange(1.0, 1.6);
      glazingType = renovated ? 'double_renouvele' : pick(['simple', 'simple', 'double']);
      inertia = 'moyenne';
      break;
    case '1975_1988':
      wallMaterial = pick(['beton', 'brique', 'parpaing']);
      wallInsulation = pick(['repartie', 'iti', 'iti']);
      uWall = rRange(0.8, 1.2);
      uRoof = rRange(0.6, 1.0);
      uFloor = rRange(0.8, 1.2);
      glazingType = 'double';
      inertia = 'moyenne';
      break;
    case '1989_2000':
      wallMaterial = pick(['beton', 'brique', 'parpaing']);
      wallInsulation = 'iti';
      uWall = rRange(0.5, 0.8);
      uRoof = rRange(0.35, 0.55);
      uFloor = rRange(0.6, 0.9);
      glazingType = 'double';
      inertia = pick(['moyenne', 'moyenne', 'legere']);
      break;
    case '2001_2012':
      wallMaterial = pick(['beton', 'brique', 'bois']);
      wallInsulation = pick(['iti', 'ite']);
      uWall = rRange(0.35, 0.5);
      uRoof = rRange(0.25, 0.35);
      uFloor = rRange(0.4, 0.6);
      glazingType = 'double';
      inertia = pick(['moyenne', 'legere', 'lourde']);
      break;
    case 'apres_2012':
      wallMaterial = pick(['beton', 'bois', 'brique']);
      wallInsulation = pick(['ite', 'iti', 'ite']);
      uWall = rRange(0.2, 0.4);
      uRoof = rRange(0.15, 0.25);
      uFloor = rRange(0.25, 0.4);
      glazingType = pick(['double', 'triple', 'triple']);
      inertia = pick(['moyenne', 'lourde', 'legere']);
      break;
  }

  const roofType = usage === 'residential_individual' ? 'inclinee' : pick(['terrasse', 'inclinee', 'inclinee']);
  const glazingRatio =
    usage === 'tertiary_office' ? rRange(0.25, 0.55) :
    era.key === 'avant_1948' ? rRange(0.12, 0.22) :
    era.key === 'apres_2012' ? rRange(0.2, 0.35) : rRange(0.15, 0.3);

  // Solar protection: more frequent in the south and in recent buildings; older
  // stock often has shutters (volets) but not always.
  const solarProtection =
    era.key === 'avant_1948' ? rand() < 0.45 :
    era.key === '1949_1974' ? rand() < 0.35 :
    era.key === '1975_1988' ? rand() < 0.4 :
    era.key === '1989_2000' ? rand() < 0.5 :
    era.key === '2001_2012' ? rand() < 0.65 : rand() < 0.8;

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

const ENERGY_CONVERSION = { gaz_naturel: 1.0, fioul: 1.0, electricite: 2.3, reseau_chaleur: 1.0, bois: 1.0, pac: 2.3 };
const ENERGY_GES_FACTOR = { gaz_naturel: 0.227, fioul: 0.324, electricite: 0.045, reseau_chaleur: 0.11, bois: 0.027, pac: 0.045 }; // kgCO2/kWh final

function heatingForEra(era) {
  switch (era.key) {
    case 'avant_1948':
      return pickWeighted([['fioul', 0.35], ['gaz_naturel', 0.35], ['electricite', 0.15], ['reseau_chaleur', 0.1], ['bois', 0.05]]);
    case '1949_1974':
      return pickWeighted([['gaz_naturel', 0.4], ['fioul', 0.3], ['electricite', 0.2], ['reseau_chaleur', 0.1]]);
    case '1975_1988':
      return pickWeighted([['electricite', 0.55], ['gaz_naturel', 0.3], ['fioul', 0.1], ['reseau_chaleur', 0.05]]);
    case '1989_2000':
      return pickWeighted([['gaz_naturel', 0.45], ['electricite', 0.35], ['pac', 0.1], ['fioul', 0.05], ['bois', 0.05]]);
    case '2001_2012':
      return pickWeighted([['gaz_naturel', 0.45], ['pac', 0.25], ['electricite', 0.2], ['bois', 0.05], ['reseau_chaleur', 0.05]]);
    case 'apres_2012':
      return pickWeighted([['pac', 0.55], ['gaz_naturel', 0.25], ['reseau_chaleur', 0.1], ['bois', 0.05], ['electricite', 0.05]]);
  }
}

const HEATING_KIND = {
  gaz_naturel: ['chaudiere_gaz', 'chaudiere_gaz_condensation'],
  fioul: ['chaudiere_fioul'],
  electricite: ['radiateurs_electriques', 'convecteurs_electriques'],
  reseau_chaleur: ['reseau_chaleur_urbain'],
  bois: ['poele_bois', 'chaudiere_bois'],
  pac: ['pac_air_eau', 'pac_air_air'],
};

function systemEfficiency(energy, kind, era) {
  if (energy === 'pac') return rRange(2.4, 3.0);
  if (energy === 'electricite') return 1.0;
  if (energy === 'bois') return rRange(0.75, 0.85);
  if (energy === 'reseau_chaleur') return rRange(0.85, 0.95);
  if (kind === 'chaudiere_gaz_condensation') return rRange(0.9, 0.98);
  if (energy === 'gaz_naturel') return era.key === 'avant_1948' || era.key === '1949_1974' ? rRange(0.72, 0.82) : rRange(0.8, 0.9);
  if (energy === 'fioul') return rRange(0.7, 0.8);
  return 0.9;
}

function buildSystems(era, usage, city) {
  const heatingEnergy = heatingForEra(era);
  const heatingKind = pick(HEATING_KIND[heatingEnergy]);
  const heatingEff = systemEfficiency(heatingEnergy, heatingKind, era);

  const maxAge = Math.max(2, 2025 - era.min - 2);
  const heating = { kind: heatingKind, energy: heatingEnergy, ageYears: rInt(2, Math.min(maxAge, 40)) };

  // Secondary system: occasional wood stove or electric backup
  const heatingSecondary = rand() < 0.12
    ? { kind: pick(['poele_bois', 'radiateurs_electriques_appoint']), energy: pick(['bois', 'electricite']), ageYears: rInt(3, 20) }
    : null;

  // DHW follows heating energy in most cases
  const dhwEnergy = rand() < 0.7 ? heatingEnergy : pick(['electricite', 'gaz_naturel']);
  const dhwKind =
    dhwEnergy === 'electricite' ? 'chauffe_eau_electrique' :
    dhwEnergy === 'pac' ? 'chauffe_eau_thermodynamique' :
    dhwEnergy === 'gaz_naturel' ? 'chauffe_bain_gaz' :
    dhwEnergy === 'fioul' ? 'production_ecs_fioul' :
    dhwEnergy === 'reseau_chaleur' ? 'ecs_reseau_chaleur' : 'ballon_bois';
  const dhw = { kind: dhwKind, energy: dhwEnergy, ageYears: rInt(2, Math.min(maxAge, 20)) };

  // Cooling: mostly absent; some PAC air-air and tertiary climatisation, more in the south
  const south = city.summer >= 1500;
  let cooling = null;
  if (usage === 'tertiary_office' && rand() < (south ? 0.55 : 0.35)) cooling = 'climatisation_centralisee';
  else if (heatingKind === 'pac_air_air' && rand() < 0.7) cooling = 'pac_air_air';
  else if (south && rand() < 0.12) cooling = 'pac_air_air';

  const ventilation =
    era.key === 'avant_1948' ? pickWeighted([['naturelle', 0.7], ['vmc_simple_flux', 0.3]]) :
    era.key === '1949_1974' ? pickWeighted([['naturelle', 0.5], ['vmc_simple_flux', 0.5]]) :
    era.key === '1975_1988' ? 'vmc_simple_flux' :
    era.key === '1989_2000' ? pickWeighted([['vmc_simple_flux', 0.6], ['vmc_hygro', 0.4]]) :
    era.key === '2001_2012' ? pickWeighted([['vmc_hygro', 0.6], ['vmc_simple_flux', 0.25], ['vmc_double_flux', 0.15]]) :
    pickWeighted([['vmc_double_flux', 0.6], ['vmc_hygro', 0.4]]);

  const hasCeilingFans = south && rand() < 0.15;

  const pvSurfaceM2 =
    era.key === 'apres_2012' ? (rand() < 0.35 ? round0(rRange(10, usage === 'residential_individual' ? 30 : 120)) : 0) :
    era.key === '2001_2012' ? (rand() < 0.15 ? round0(rRange(10, 60)) : 0) :
    rand() < 0.03 ? round0(rRange(10, 40)) : 0;

  return {
    systems: { heating, heatingSecondary, dhw, cooling, ventilation, hasCeilingFans, pvSurfaceM2 },
    heatingEff,
  };
}

// ---------------------------------------------------------------------------
// DPE model — simplified physics consistent with envelope + systems
// ---------------------------------------------------------------------------

const U_WINDOW = { simple: 5.5, double: 2.8, double_renouvele: 1.5, triple: 1.0 };
const VENT_TERM = { naturelle: 0.3, vmc_simple_flux: 0.22, vmc_hygro: 0.18, vmc_double_flux: 0.1 };

const EP_THRESHOLDS = [[70, 'A'], [110, 'B'], [180, 'C'], [250, 'D'], [330, 'E'], [420, 'F'], [Infinity, 'G']];
const GES_THRESHOLDS = [[6, 'A'], [11, 'B'], [30, 'C'], [50, 'D'], [70, 'E'], [100, 'F'], [Infinity, 'G']];

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
  const auxGesPerM2 = (auxEpPerM2 / 2.3) * ENERGY_GES_FACTOR.electricite;

  const coolingEpPerM2 = systems.cooling ? 8 : 0;
  const coolingGesPerM2 = (coolingEpPerM2 / 2.3) * ENERGY_GES_FACTOR.electricite;

  const ep = round0(heatingEpPerM2 + dhwEpPerM2 + auxEpPerM2 + coolingEpPerM2);
  const ges = round0(heatingGesPerM2 + dhwGesPerM2 + auxGesPerM2 + coolingGesPerM2);

  const epLabel = labelFor(ep, EP_THRESHOLDS);
  const gesLabel = labelFor(ges, GES_THRESHOLDS);
  const label = LABEL_RANK[gesLabel] > LABEL_RANK[epLabel] ? gesLabel : epLabel;

  return { label, ep, ges, gesLabel };
}

// ---------------------------------------------------------------------------
// Summer comfort — degrés-heures d'inconfort (sans climatisation)
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
// Geometry & identity
// ---------------------------------------------------------------------------

function buildGeometry(usage) {
  let floors, footprint;
  switch (usage) {
    case 'residential_collective':
      floors = rInt(3, 9);
      footprint = rRange(120, 500);
      break;
    case 'residential_individual':
      floors = rInt(1, 2);
      footprint = rRange(60, 150);
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
    heightM: round(floors * 3.1, 1),
    livingAreaM2: livingArea,
    housingUnits,
  };
}

const RNB_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function registryId() {
  let s = '';
  for (let i = 0; i < 12; i++) s += RNB_CHARS[Math.floor(rand() * RNB_CHARS.length)];
  return s;
}

function makeAddress(city) {
  const n = rand() < 0.08 ? `${rInt(1, 140)} bis` : `${rInt(1, 180)}`;
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
        ['residential_collective', 0.62],
        ['residential_individual', 0.18],
        ['tertiary_office', 0.08],
        ['tertiary_school', 0.05],
        ['tertiary_commerce', 0.07],
      ]);

      const envelope = buildEnvelope(era, usage);
      const { systems, heatingEff } = buildSystems(era, usage, city);
      const geometry = buildGeometry(usage);
      const eraPenalty =
        era.key === 'avant_1948' ? 0.5 :
        era.key === '1949_1974' ? 0.35 :
        era.key === '1975_1988' ? 0.1 : 0;
      const certificate = computeCertificate(envelope, systems, heatingEff, usage, city, eraPenalty);
      const comfort = computeComfort(envelope, city);

      let nationalDbId;
      do {
        nationalDbId = `BDNB-${String(rInt(1000000, 9999999))}`;
      } while (usedIds.has(nationalDbId));
      usedIds.add(nationalDbId);

      const annualConsumptionKwhEp = round0(certificate.ep * geometry.livingAreaM2);
      const annualGesKgCo2 = round0(certificate.ges * geometry.livingAreaM2);
      const annualEnergyCostEur = round0(annualConsumptionKwhEp * rRange(0.145, 0.155));

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

  const outPath = fileURLToPath(new URL('../src/data/buildings-fr.json', import.meta.url));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(buildings), 'utf8');

  const sizeBytes = statSync(outPath).size;

  const perLabel = {};
  const perGesLabel = {};
  const perCity = {};
  const perEra = {};
  let epSum = 0;
  for (const b of buildings) {
    perLabel[b.certificate.label] = (perLabel[b.certificate.label] || 0) + 1;
    perGesLabel[b.certificate.gesLabel] = (perGesLabel[b.certificate.gesLabel] || 0) + 1;
    perCity[b.city] = (perCity[b.city] || 0) + 1;
    const eraKey =
      b.constructionYear <= 1948 ? 'avant 1948' :
      b.constructionYear <= 1974 ? '1949-1974' :
      b.constructionYear <= 1988 ? '1975-1988' :
      b.constructionYear <= 2000 ? '1989-2000' :
      b.constructionYear <= 2012 ? '2001-2012' : 'apres 2012';
    perEra[eraKey] = (perEra[eraKey] || 0) + 1;
    epSum += b.certificate.ep;
  }

  const n = buildings.length;
  console.log(`Generated ${n} buildings -> ${outPath}`);
  console.log(`File size: ${(sizeBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Mean EP: ${(epSum / n).toFixed(0)} kWhEP/m2/an`);
  console.log('\nDPE label distribution:');
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
  console.log('\nPer-city count:');
  for (const city of CITIES) {
    console.log(`  ${city.name}: ${perCity[city.name] || 0}`);
  }
}

main();
