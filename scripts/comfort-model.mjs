/**
 * Renovativ AI Map — shared summer comfort (degree-hours) model.
 *
 * Single source of truth for comfort.dh2025/dh2050/dh2100 across the three
 * region pipelines (ingest-bdnb.mjs, fetch-nyc.mjs, fetch-london.mjs) and the
 * one-shot backfill (recalc-comfort.mjs).
 *
 * MODELLED field — no source dataset carries a summer-comfort indicator, so
 * degree-hours of summer discomfort (without active cooling) are estimated:
 *
 *   dh2025 = clamp(base x inertia x glazing x protection x era x uhi
 *                  x heightFactor + noise, 150, 6000)
 *
 *   - base:         per-city median of the CURRENT dh2025 in the existing
 *                   dataset (set via calibrateBase; preserves absolute levels
 *                   while restoring realistic variance).
 *   - inertia:      lourde 0.70, moyenne 1.00, legere 1.25 (heavy mass
 *                   buffers heat waves, light structures overheat).
 *   - glazing:      1 + max(0, glazingRatio - 0.20) x 1.2 (solar gains above
 *                   a 20% window-to-wall ratio).
 *   - protection:   external solar protection (shutters, blinds) x0.72.
 *   - era:          <1945: 0.95, 1945-1974: 1.10, 1975-2005: 1.05,
 *                   2006-2015: 0.85, >2015: 0.70 (modern summer codes).
 *   - uhi:          urban heat island, 1 + 0.35 x exp(-d / 8000), d = haversine
 *                   distance in metres from the building to the region centre
 *                   (fr [43.85, 7.05], uk [51.5, -0.12], us [40.75, -73.98]).
 *   - heightFactor: floors >= 8 -> x1.20; floors >= 4 -> x1.10; else x1.0
 *                   (upper floors of tall buildings overheat more).
 *   - noise:        deterministic per building id (FNV-1a hash -> uniform in
 *                   [-0.15, +0.15]) x dh2025, standing in for unobserved
 *                   micro-factors (orientation, shading, courtyard).
 *
 * Climate horizons: fr/us dh2050 = 1.45 x, dh2100 = 2.05 x;
 *                   uk    dh2050 = 1.5  x, dh2100 = 2.2  x.
 */

// ---------------------------------------------------------------------------
// Region config
// ---------------------------------------------------------------------------

export const REGION_CONFIG = {
  fr: { center: [43.85, 7.05], m2050: 1.45, m2100: 2.05, defaultBase: 1600 },
  uk: { center: [51.5, -0.12], m2050: 1.5, m2100: 2.2, defaultBase: 750 },
  us: { center: [40.75, -73.98], m2050: 1.45, m2100: 2.05, defaultBase: 1350 },
};

const MIN_BOUND = 150;
const MAX_BOUND = 6000;

// Per-region base (median of the current dataset), set by calibrateBase.
const regionBase = { fr: null, uk: null, us: null };

// ---------------------------------------------------------------------------
// Deterministic hash (FNV-1a) -> [0, 1)
// ---------------------------------------------------------------------------
function hash01(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

/** Haversine distance in metres between [lat, lng] points. */
function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

const median = (values) => {
  const v = [...values].sort((a, b) => a - b);
  const n = v.length;
  return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
};

// ---------------------------------------------------------------------------
// Base calibration: per-city median of the CURRENT dh2025 in the dataset.
// Call once per region before running computeComfort over that region's stock.
// ---------------------------------------------------------------------------
export function calibrateBase(regionId, buildings) {
  const cfg = REGION_CONFIG[regionId];
  if (!cfg) throw new Error(`unknown regionId "${regionId}"`);
  const values = buildings
    .map((b) => Number(b?.comfort?.dh2025))
    .filter((n) => Number.isFinite(n) && n > 0);
  regionBase[regionId] = values.length > 0 ? median(values) : cfg.defaultBase;
  return regionBase[regionId];
}

// ---------------------------------------------------------------------------
// Factor functions (exported for testing / inspection)
// ---------------------------------------------------------------------------

export const inertiaFactor = (inertia) =>
  inertia === 'lourde' ? 0.7 : inertia === 'legere' ? 1.25 : 1.0;

export const glazingFactor = (glazingRatio) =>
  1 + Math.max(0, (Number(glazingRatio) || 0) - 0.2) * 1.2;

export const protectionFactor = (solarProtection) => (solarProtection ? 0.72 : 1.0);

export function eraFactor(year) {
  const y = Number(year) || 1975;
  if (y < 1945) return 0.95;
  if (y < 1975) return 1.1;
  if (y <= 2005) return 1.05;
  if (y <= 2015) return 0.85;
  return 0.7;
}

export function uhiFactor(lat, lng, center) {
  const d = haversineM(lat, lng, center[0], center[1]);
  return 1 + 0.35 * Math.exp(-d / 8000);
}

export const heightFactor = (floors) => (floors >= 8 ? 1.2 : floors >= 4 ? 1.1 : 1.0);

// ---------------------------------------------------------------------------
// computeComfort(building, regionId, regionCenter)
//   building:     object with id, lat, lng, floors, constructionYear and
//                 envelope { inertia, glazingRatio, solarProtection }
//   regionId:     'fr' | 'uk' | 'us'
//   regionCenter: optional [lat, lng] override (defaults to REGION_CONFIG)
// Returns { dh2025, dh2050, dh2100 } (integers).
// ---------------------------------------------------------------------------
export function computeComfort(building, regionId, regionCenter) {
  const cfg = REGION_CONFIG[regionId];
  if (!cfg) throw new Error(`unknown regionId "${regionId}"`);
  const base = regionBase[regionId] ?? cfg.defaultBase;
  const center = regionCenter ?? cfg.center;

  const env = building?.envelope ?? {};
  const raw =
    base *
    inertiaFactor(env.inertia) *
    glazingFactor(env.glazingRatio) *
    protectionFactor(env.solarProtection) *
    eraFactor(building?.constructionYear) *
    uhiFactor(Number(building?.lat) || center[0], Number(building?.lng) || center[1], center) *
    heightFactor(Number(building?.floors) || 1);

  // Deterministic per-building noise in [-0.15, +0.15] x dh2025.
  const key = String(building?.id ?? building?.nationalDbId ?? `${building?.lat},${building?.lng}`);
  const noise = (hash01(key) * 2 - 1) * 0.15 * raw;

  const dh2025 = Math.round(Math.min(MAX_BOUND, Math.max(MIN_BOUND, raw + noise)));
  return {
    dh2025,
    dh2050: Math.round(dh2025 * cfg.m2050),
    dh2100: Math.round(dh2025 * cfg.m2100),
  };
}
