/**
 * Renovativ AI Map — one-shot comfort backfill.
 *
 * Recomputes ONLY the comfort field of every building in the three region
 * datasets with the shared model (scripts/comfort-model.mjs), calibrating the
 * per-city base to the median of the CURRENT dh2025 values so absolute levels
 * are preserved while realistic variance is restored.
 *
 * Every other field is left byte-identical in value (objects are mutated only
 * on their .comfort property; compact JSON like the source files).
 *
 * Usage:
 *   node scripts/recalc-comfort.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { computeComfort, calibrateBase } from './comfort-model.mjs';

const REGIONS = [
  { file: 'public/data/fr.json', regionId: 'fr', expected: 12000 },
  { file: 'public/data/uk-london.json', regionId: 'uk', expected: 7843 },
  { file: 'public/data/us-nyc.json', regionId: 'us', expected: 10000 },
];

// ---------------------------------------------------------------------------
// Stats helpers
// ---------------------------------------------------------------------------
function percentile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function stats(values) {
  const s = [...values].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  const variance = s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length;
  return {
    min: s[0],
    p25: Math.round(percentile(s, 0.25)),
    median: Math.round(percentile(s, 0.5)),
    p75: Math.round(percentile(s, 0.75)),
    max: s[s.length - 1],
    stddev: Math.round(Math.sqrt(variance)),
  };
}

const fmt = (t) =>
  `min ${t.min} | p25 ${t.p25} | median ${t.median} | p75 ${t.p75} | max ${t.max} | stddev ${t.stddev}`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
for (const { file, regionId, expected } of REGIONS) {
  const abs = path.resolve(file);
  const buildings = JSON.parse(fs.readFileSync(abs, 'utf8'));

  if (buildings.length !== expected) {
    console.error(`FATAL: ${file} has ${buildings.length} buildings, expected ${expected}`);
    process.exit(1);
  }

  // Snapshot of every non-comfort field (value-level integrity check).
  const stripComfort = (b) => {
    const { comfort, ...rest } = b;
    return JSON.stringify(rest);
  };
  const beforeSnapshot = buildings.map(stripComfort);

  const before = {
    dh2025: stats(buildings.map((b) => b.comfort.dh2025)),
    dh2050: stats(buildings.map((b) => b.comfort.dh2050)),
    dh2100: stats(buildings.map((b) => b.comfort.dh2100)),
  };

  // Base = per-city median of the CURRENT dh2025 (preserves absolute levels).
  const base = calibrateBase(regionId, buildings);

  for (const b of buildings) b.comfort = computeComfort(b, regionId);

  // Validation: no NaN / non-positive comfort, horizons consistent.
  for (const b of buildings) {
    const { dh2025, dh2050, dh2100 } = b.comfort;
    if (![dh2025, dh2050, dh2100].every((n) => Number.isFinite(n) && n > 0)) {
      console.error(`FATAL: invalid comfort on ${b.id} in ${file}:`, b.comfort);
      process.exit(1);
    }
  }

  // Integrity: every non-comfort field unchanged in value.
  for (let i = 0; i < buildings.length; i++) {
    if (stripComfort(buildings[i]) !== beforeSnapshot[i]) {
      console.error(`FATAL: non-comfort field changed on ${buildings[i].id} in ${file}`);
      process.exit(1);
    }
  }

  // Write back compact JSON and verify round-trip.
  fs.writeFileSync(abs, JSON.stringify(buildings));
  const reparsed = JSON.parse(fs.readFileSync(abs, 'utf8'));
  if (reparsed.length !== expected) {
    console.error(`FATAL: ${file} does not round-trip (${reparsed.length} != ${expected})`);
    process.exit(1);
  }

  const after = {
    dh2025: stats(reparsed.map((b) => b.comfort.dh2025)),
    dh2050: stats(reparsed.map((b) => b.comfort.dh2050)),
    dh2100: stats(reparsed.map((b) => b.comfort.dh2100)),
  };

  console.log(`\n=== ${file} (${regionId}, n=${expected}, calibrated base=${Math.round(base)}) ===`);
  for (const h of ['dh2025', 'dh2050', 'dh2100']) {
    console.log(`  ${h} BEFORE: ${fmt(before[h])}`);
    console.log(`  ${h} AFTER : ${fmt(after[h])}`);
  }
  const cv = after.dh2025.stddev / after.dh2025.median;
  console.log(`  stddev/median (dh2025): ${(cv * 100).toFixed(1)}% ${cv >= 0.3 ? 'OK' : 'WARNING: below 30%'}`);
}

console.log('\nAll three datasets recalculated and validated.');
