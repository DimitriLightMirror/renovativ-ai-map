/**
 * Patch annualEnergyCostEur in shipped JSON using fuel-aware local tariffs.
 * Does not re-fetch remote APIs — updates public/data/{uk-london,dk,us-nyc}.json in place.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('public/data');

const TARIFFS = {
  uk: {
    electricite: 0.26,
    gaz_naturel: 0.07,
    fioul: 0.09,
    reseau_chaleur: 0.1,
    bois: 0.08,
    pac: 0.22,
    default: 0.12,
  },
  dk: {
    electricite: 2.5,
    gaz_naturel: 1.2,
    fioul: 1.4,
    reseau_chaleur: 0.95,
    bois: 0.7,
    pac: 2.2,
    default: 1.0,
  },
  us: {
    electricite: 0.3,
    gaz_naturel: 0.05,
    fioul: 0.08,
    reseau_chaleur: 0.12,
    bois: 0.06,
    pac: 0.28,
    default: 0.18,
  },
};

function priceFor(tariffs, building) {
  const fuel = building.systems?.heating?.energy ?? 'default';
  return tariffs[fuel] ?? tariffs.default;
}

function patch(file, regionKey) {
  const full = path.join(ROOT, file);
  const buildings = JSON.parse(fs.readFileSync(full, 'utf8'));
  const tariffs = TARIFFS[regionKey];
  let changed = 0;
  for (const b of buildings) {
    const next = Math.round((b.annualConsumptionKwhEp || 0) * priceFor(tariffs, b));
    if (b.annualEnergyCostEur !== next) {
      b.annualEnergyCostEur = next;
      changed += 1;
    }
  }
  fs.writeFileSync(full, `${JSON.stringify(buildings)}\n`);
  console.log(`${file}: updated ${changed}/${buildings.length} annualEnergyCostEur`);
}

patch('uk-london.json', 'uk');
patch('dk.json', 'dk');
patch('us-nyc.json', 'us');
