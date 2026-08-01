# Renovativ AI Map

Public interactive map of real building stocks: energy certificates (DPE, EPC,
HERS, Energielabel, Energimærke), costed renovation scenarios and heatwave
readiness at building scale.

Live site: https://dimitrilightmirror.github.io/renovativ-ai-map/

See also [docs/PRD.md](docs/PRD.md).

## Stack

React 18 · TypeScript · Vite · Leaflet · static hosting on GitHub Pages.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
npm run ingest:bdnb     # regenerate public/data/fr.json from BDNB CSV
npm run fetch:denmark   # EMOData → public/data/dk.json (needs .env.local)
```

Other fetch pipelines (not wired as npm scripts): `scripts/fetch-london.mjs`,
`scripts/fetch-nyc.mjs`. After tariff changes: `node scripts/recalc-energy-costs.mjs`.

## Live regions

| Id | Coverage | Source | Certificate | Currency |
|----|----------|--------|-------------|----------|
| `fr` | Alpes-Maritimes (06), **Menton in full** | BDNB | DPE | € |
| `uk` | London | EPC register (DLUHC) | EPC | £ |
| `us` | Manhattan (NYC) | LL84 / PLUTO / DoITT | HERS / LL84 | $ |
| `nl` | Randstad | PDOK BAG | Energielabel (modelled) | € |
| `dk` | Copenhagen (demo) | EMOData | Energimærke | kr. |

France pipeline notes:

1. BDNB geometry (Lambert-93 → WGS84), DPE, Fichiers Fonciers, BAN address.
2. **Menton (INSEE 06083) imported exhaustively** (incl. 47 Avenue de Sospel);
   other communes capped at 12 000 buildings, DPE-first.
3. Summer comfort (`dh2025/2050/2100`) is **modelled**, not measured in this export.

Denmark: default bbox is central Copenhagen. National tiling is supported via
`EMO_BBOX` but EMOData enforces ~0.60 deg² per request (auto-tiled). Do not
ship multi‑million-label `dk.json` to GitHub Pages as a single file.

Energy bills and renovation savings use **fuel-aware local tariffs** (district
heat vs electricity, etc.). Field `annualEnergyCostEur` is in the region’s
currency despite the historical name.

## Deploy

`.github/workflows/deploy.yml` publishes `dist/` to GitHub Pages on every push
to `main` (project site base `/renovativ-ai-map/`).
