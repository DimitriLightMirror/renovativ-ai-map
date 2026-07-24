# Renovativ AI Map · Netherlands

Interactive public map of the Dutch building stock: energy diagnosis
(Energielabel), costed renovation scenarios and heatwave preparation, at
building level. English UI with Dutch domain terms. See the full product
requirements in [docs/PRD.md](docs/PRD.md).

## Stack

React 18 · TypeScript · Vite · Leaflet · static hosting on GitHub Pages.

## Scripts

```bash
npm install          # install dependencies
npm run dev          # development server
npm run build        # production build (dist/)
npm run typecheck    # TypeScript check
npm run preview      # preview the build
npm run fetch:nl     # regenerate src/data/buildings-nl.json from PDOK BAG
```

## Data

The bundled dataset (`src/data/buildings-nl.json`) contains **8000 real
buildings** (2000 per city: Amsterdam, Rotterdam, Den Haag, Utrecht) pulled
from the **PDOK BAG** (Basisregistratie Adressen en Gebouwen) WFS v2.0,
keyless national open data:

- `bag:pand` — real footprints, bouwjaar, gebruiksdoel, geometry
- `bag:verblijfsobject` — real addresses, postcodes, unit areas

Pipeline (`scripts/fetch-netherlands.mjs`):

1. Tiled WFS queries per city, joined pand to verblijfsobject.
2. Footprint area and centroid computed in RD New (EPSG:28992, Amersfoort
   datum), then reprojected to WGS84 with proj4. The transform is validated
   on a known Dam Square point (Royal Palace, RD 121357,487373 →
   lat 52.3731, lng 4.8932) before any mass conversion; the run aborts on
   failure or if more than 1% of points fall outside Dutch bounds.

**Estimated fields** (NOT measured, clearly modelled):

- `certificate.*` — every energielabel is ESTIMATED from bouwjaar-era Dutch
  archetypes (rijtjeshuizen, portiekflats, galerijflats, vrijstaand) plus a
  modelled retrofit share. EP-online (RVO) requires an API key and no keyless
  energielabel source exists, so real labels could not be joined. The Dutch
  A+++..G scale is collapsed onto A..G (A+++/A++/A+ display as A).
- `systems.*` — modelled Dutch stock: gas CV-ketel dominant, growing
  warmtepomp share, cooling rare.
- `envelope.*` — era-based Dutch U-value defaults (BAG carries no envelope).
- `comfort.*` — modelled summer discomfort degree-hours for the maritime
  climate (dh2025 base 250-800, ×1.6 for 2050, ×2.3 for 2100). Dutch
  regulation uses TOjuli (NTA 8800) instead; DH is a proxy here.

Live per-address energielabels can be fetched at runtime through
`src/api/epOnline.ts` (overheid.io v3 wrapper of EP-online) once an API key
is set in `.env` (`VITE_EPONLINE_API_KEY`, see `.env.example`).

## Regulation and pricing

Dutch corpus in `src/content/regulation-nl.ts`: BEG (EPBD), BENG 1/2/3,
Trias Energetica, label C rental target 2030, TOjuli / NTA 8800, ISDE, SVV.
Gesture prices (`src/content/gestures-nl.ts`) are indicative EUR figures
based on ISDE/SVV subsidy reference ranges, not live market quotes.

## Branch strategy

- `main` — France (BDNB, DPE, €)
- `uk` — United Kingdom (EPC register, £)
- `usa` — United States (HERS Index, $)
- `netherlands` — Netherlands (BAG, Energielabel, €) ← this branch

Each branch replaces `src/config/country.ts`, the regulation corpus
(`src/content/`) and the dataset, without modifying the shared contract
`src/types/index.ts`.

## Deployment

The workflow `.github/workflows/deploy.yml` publishes `dist/` to GitHub
Pages on every push (project site: base `/renovativ-ai-map/`).
