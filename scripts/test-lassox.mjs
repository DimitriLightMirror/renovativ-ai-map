/**
 * Parser test for the Lassox BBR client — runs the real parser from
 * src/api/bbrLassox.ts against the documented sample response from
 * https://docs.lassox.com/data-apis/bbr/ (saved, minus repeated PII blocks,
 * as scripts/fixtures/lassox-property-summary.sample.json).
 *
 * No live API key needed: this validates field mapping only.
 * Run: node scripts/test-lassox.mjs
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Node >= 22.6 runs TypeScript directly via type stripping (default-on in v24).
const { mapSummaryToBuilding, utm32ToWgs84 } = await import('../src/api/bbrLassox.ts');

const here = dirname(fileURLToPath(import.meta.url));
const sample = JSON.parse(
  await readFile(join(here, 'fixtures', 'lassox-property-summary.sample.json'), 'utf8'),
);

let failures = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
}

// --- Coordinate conversion sanity check -------------------------------------
// POINT(723131.42 6181262.6) UTM32 -> WGS84. Reference values verified with
// proj4 (EPSG:25832 -> EPSG:4326): lat 55.725615, lng 12.553374.
const geo = utm32ToWgs84(723131.42, 6181262.6);
console.log(`\nUTM32 723131.42 6181262.6 -> lat ${geo.lat.toFixed(5)}, lng ${geo.lng.toFixed(5)}`);
check('lat matches proj4 reference', Math.abs(geo.lat - 55.725615) < 0.0001, true);
check('lng matches proj4 reference', Math.abs(geo.lng - 12.553374) < 0.0001, true);

// --- Main building (index 1: the 1937 parcelhus) ----------------------------
const main = mapSummaryToBuilding(sample, 1);
console.log('\nMapped Building (main, index 1):');
console.log(JSON.stringify(main, null, 2));

check('id', main.id, 'bbr-f8b4b693-8c3a-420e-aa74-e8ac35a51fe4');
check('nationalDbId (BFE)', main.nationalDbId, '2002265');
check('registryId', main.registryId, '157-79972');
check('address', main.address, 'Vejnavn 5, 2900 Hellerup');
check('city', main.city, 'Hellerup');
check('postcode', main.postcode, '2900');
check('department (kommune)', main.department, 'Gentofte');
check('usage', main.usage, 'residential_individual');
check('constructionYear', main.constructionYear, 1937);
check('footprintAreaM2 (builtArea)', main.footprintAreaM2, 100);
check('floors', main.floors, 1);
check('livingAreaM2', main.livingAreaM2, 148);
check('housingUnits', main.housingUnits, 1);
check('wallMaterial', main.envelope.wallMaterial, 'Mursten (tegl, kalksandsten, cementsten)');
check('roofType', main.envelope.roofType, 'inclinee');
check('heating energy (fjernvarme)', main.systems.heating.energy, 'reseau_chaleur');

// --- Secondary building (index 0: the garage, constructionYear sentinel) -----
const garage = mapSummaryToBuilding(sample, 0);
console.log('\nMapped Building (garage, index 0):');
console.log(JSON.stringify(garage, null, 2));
check('garage constructionYear sentinel 1000 -> 0', garage.constructionYear, 0);
check('garage usage fallback', garage.usage, 'residential_individual');

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log('\nAll checks passed.');
