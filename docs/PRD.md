# Renovativ AI Map — Product Requirements Document

**Version 1.1 — 2026-08-01**
**Source specification:** French video dictation transcript (`[French (auto-generated)] Video Project 24 [DownSub.com].txt`), a complete walkthrough of the Renovativ concept.
**Brand:** Renovativ — terracotta `#D77259`, sand `#CDC7B7`, deep green `#273F3F`.

---

## 1. Vision

Renovativ AI Map is a public web application that renders **regional building-stock demos on an interactive map** (not a full national dump — static hosting cannot hold ~20M BDNB buildings). Clicking any building opens a diagnostic panel answering four questions:

1. **What is this building?** — characteristics (geometry, envelope, systems), sourced from the national building database.
2. **What is its energy performance certificate?** — DPE (FR), EPC (UK), HERS/LL84 (US), Energielabel (NL), Energimærke (DK), with the regulation that governs it.
3. **What is the best renovation scenario?** — ranked renovation gestures (a "potential graph" / *graphique de chapelet*) with costs, savings and payback in local currency.
4. **How prepared is it for heatwaves?** — summer comfort indicator at climate horizons 2025 / 2050 / 2100, plus concrete preparation measures linked to national regulation.

The tool is designed to be **easy, pedagogical and accessible** — from non-expert building owners to energy auditors (transcript: *"pensé pour être facile d'utilisation, pédagogique et accessible à tout types d'utilisateurs, des non-experts jusqu'aux auditeurs énergétiques"*).

---

## 2. Personas

| Persona | Need |
|---|---|
| Portfolio owner / copropriété trustee | Prioritize buildings to renovate using precomputed indicators (DPE, summer comfort) |
| Homeowner | Understand their building's DPE, heatwave risk, and best-value renovation |
| Energy auditor | Refine the auto-filled description (audit level), test and compare scenarios |
| Public authority / urban planner | Map view of stock performance, climate vulnerability at 2050/2100 |

---

## 3. Data sources

### 3.1 Primary: BDNB — Base de Données Nationale des Bâtiments (France)
- Maintainer: CSTB. Open data, Licence Ouverte 2.0, distributed via data.gouv.fr.
- Used fields (per building): `batiment_groupe_id`, RNB ID, address, usage, construction period, footprint, height, floors, living area, DPE labels (energy & GES), envelope archetypes (wall/roof/floor materials & insulation, glazing ratio & type, solar protection), systems (heating, DHW, cooling, ventilation, PV), and the precomputed **summer comfort indicator** (*indicateur de confort d'été*).
- Missing values are completed by **enrichers** (statistical inference from archetype tables), exactly as in the transcript: *"Les informations manquantes sont complétées grâce aux enrichisseurs intégrés."*
- **Shipped France data:** real BDNB extract for **département 06 (Alpes-Maritimes)** — Menton imported in full (~5k georeferenced buildings), other communes sampled to ~12k (DPE-first). Total ~17k buildings in `public/data/fr.json`. Full national BDNB (~20M) requires tiled hosting (PMTiles / object storage), not a single GitHub Pages JSON.
- Pipeline: `npm run ingest:bdnb` (`scripts/ingest-bdnb.mjs`).

### 3.2 Climate
- Current weather: 2025 reference year.
- Projections: 2050 and 2100 horizons from the French climate projection trajectory (DRIAS / Météo-France), enriched with the **urban heat island** effect by location, per the transcript. Summer comfort degree-hours are **modelled** in this demo.

### 3.3 Other regions (same app, region registry — not git branches)
- **UK · London:** EPC register (DLUHC), SAP/RdSAP.
- **US · NYC Manhattan:** DoITT footprints, PLUTO, LL84 measured energy where available.
- **NL · Randstad:** PDOK BAG buildings; Energielabel modelled pending EP-online.
- **DK · Copenhagen:** EMOData Energimærke (demo bbox; national fetch is tiled and experimental).

---

## 4. Functional requirements

### 4.1 MVP (this release — five regional demos)

**FR-1 Interactive regional map.** Country switcher (FR / UK / US / NL / DK); zoom reveals buildings; each marker is colored by the **national certificate label** (default) or by the **summer comfort indicator** (toggle). An info menu explains the active indicator.

**FR-2 Address search.** Search bar (top right) to zoom to an address.

**FR-3 Building panel.** Clicking a building opens the diagnostic panel with four tabs matching the user's core ask:
- **Caractéristiques** — address, BDNB/RNB identifiers, usage, construction year, geometry (footprint, floors, height, living area, housing units), envelope (walls, roof, floor, glazing, inertia), systems (heating primary/secondary, DHW, cooling, ventilation, PV). Each field displays its data origin (BDNB vs. enricher).
- **DPE** — energy label A–G, GES label, primary energy (kWhEP/m²/an), annual consumption, annual GES, annual energy cost, and the governing regulation (arrêté DPE 2021, seuils).
- **Rénovation** — the best renovation scenario for the building: ranked gesture list (*graphique de chapelet*) computed from the building's actual weaknesses (déperdition breakdown), with estimated cost, annual saving, payback, and new label per gesture; top combination proposed as the recommended scenario; eligibility flags for MaPrimeRénov' / CEE.
- **Canicule** — summer comfort indicator at 2025/2050/2100 (color-coded bubbles, green = comfortable, red = severe discomfort, per the transcript), heatwave preparation measures ranked for this building archetype (solar protection, night ventilation, ceiling fans, insulation, cool roofing…), each linked to French regulation (Plan Canicule, RE2020 summer comfort requirement, Code du travail for tertiary).

**FR-4 Regulation layer.** A structured French regulation corpus displayed contextually in every tab (see §5).

**FR-5 Public access.** No login wall for the public map (the original tool's licence flow is replaced by open access in MVP).

### 4.2 V2 (specified in the transcript, not in this build)

- Account system: login page, password reset, buildings linked to the user's SIREN, user-created buildings outlined in green.
- Building creation by double-click with BDNB auto-fetch and enrichers; full study workflow in tab order: **État initial → Rénovation → Résultats**.
- Two description levels: **Bâtiment BDNB** (synthetic) and **Bâtiment Audit** (detailed: per-wall editing with multi-select, roof splitting/merging with scissors tool, geometry vertex editing, ceiling height, last heavy renovation date, typology of dwellings T1–T5, air permeability, emitter types, thermostat programming); **Logement** level (per-dwelling simulation) — flagged "coming later" in the transcript.
- Data verification system: per-field confirmation, global reliability percentage with three indicator lights under the tab, coherence algorithms (e.g. floors/height/area consistency) that auto-adjust dependent fields, invalidate confirmations, alert light, and an **undoable history window**; help bubbles on every field.
- Simulation engine: weather 2025 or projections 2050/2100 with urban heat island; three parallel simulations per run (whole building + representative ground-floor dwelling + top-floor dwelling, the most exposed to summer discomfort); always-visible "Lancer une simulation" button.
- Results module: **Bâtiment synthèse** (colored bubbles: summer discomfort degree-hours at 3 horizons, DPE, annual consumption, annual GES, annual cost; hover reveals per-dwelling results), **Bâtiment détaillé** (interactive charts: comfort, energy by vector in primary/final energy with show/hide and aggregation modes, theoretical needs heating/cooling/lighting, envelope heat-loss breakdown by wall element, carbon, cost), **Potentiel** (choose an objective — summer comfort, GES, final/primary energy, cost, or custom weighted — engine runs dozens of simulations and renders the *graphique de chapelet* with hover cost details).
- Renovation studio: scenario CRUD (rename, duplicate, delete, compare against initial state), chapelet-from-scenario ("menu AD"), renovation gesture database with simplified/detailed modes, filters by lot (murs, baies, toiture, plancher, protections, systèmes), technical filters, text search, **intelligent filter** showing only gestures coherent with the building, per-wall gesture application with select/deselect/reapply-all, gesture parameters (insulation type, position, thickness, add-vs-replace), system gestures (generator main/secondary, automatic vs custom sizing), **coherence engine** that auto-adds induced transformations (e.g. heat pump on water radiators → emitter replacement), behavioral gestures category (future), renovation roadmap planning (future).
- Solar coherence rules (transcript §panneaux solaires): PV editable at BDNB level (presence), Audit level (surface/peak power) and roof level (panels with orientation/azimuth) — all three kept in sync automatically; solar thermal must always cover DHW, is never a secondary system, always main with backup; adding solar thermal demotes the former main generator to secondary and removing it restores it.

---

## 5. Regulatory framework (France)

| Key | Instrument | Relevance |
|---|---|---|
| `dpe_2021` | DPE réformé (arrêté du 31 mars 2021) — opposable A–G scale on primary energy (kWhEP/m²/an) and GES (kgCO₂/m²/an), worst of both | Certificate tab |
| `re2020` | RE2020 — new-build regulation incl. summer comfort requirement (degrés-heures d'inconfort threshold) | Renovation + Canicule tabs |
| `decret_tertiaire` | Décret tertiaire / Dispositif Éco Énergie Tertiaire — −40 % energy by 2030, −50 % by 2040, −60 % by 2050 for tertiary > 1 000 m² | Tertiary buildings |
| `audit_energetique` | Mandatory energy audit for sale of F/G individual houses (since 2022/2023) | Certificate tab |
| `interdiction_location` | Rental bans for energy sieves: G+ (2025), G (2028), F (2034) per the decency trajectory | Certificate tab |
| `plan_canicule` | Plan National de Gestion des Vagues de Chaleur — alert levels, building guidance | Canicule tab |
| `maprimenov` | MaPrimeRénov' + CEE — renovation grants by gesture and income | Rénovation tab |

UK branch swaps in: EPC (SAP 2012/RdSAP, A–G), Building Regulations Part L, Approved Document O (overheating), Future Homes Standard, MEES (minimum EPC E for rentals), ECO4/GBIS grants.
USA branch swaps in: RESNET HERS index, IECC 2021 / ASHRAE 90.1, DOE climate zones, IRA incentives (25C, 25D, HOMES/HEEHRA), ENERGY STAR, FEMA/NOAA heat guidance.

---

## 6. UX & brand

- Header: Renovativ logotype (terracotta), map fills the viewport, panel slides from the right.
- Palette: deep green `#273F3F` (structure, header), terracotta `#D77259` (accent, active states, CTA), sand `#CDC7B7` (surfaces, panel background), white text on green/terracotta.
- DPE scale uses the official French A(green)→G(red) color ramp; comfort bubbles green→red per the transcript.
- UI language: French for France; English chrome for UK / US / NL / DK (local proper nouns in content). Country pill labels follow the active UI language.
- No em dashes, no AI-cliché copy. Short, direct sentences.

---

## 7. Non-functional requirements

- Static site (React + Vite + TypeScript + Leaflet), no backend; free hosting on GitHub Pages at `https://dimitrilightmirror.github.io/renovativ-ai-map/`.
- Real open-data JSON under `public/data/` regenerated by ingest/fetch scripts (`ingest:bdnb`, `fetch:denmark`, `fetch-london.mjs`, `fetch-nyc.mjs`).
- All calculations client-side in a pure-TypeScript engine module (`src/engine/`), with fuel-aware local energy prices.
- Region registry (`src/regions/index.ts`) — one app, five regions; not separate git branches.

---

## 8. Architecture

```
renovativ-ai-map/
├── .github/workflows/deploy.yml
├── docs/PRD.md
├── public/brand/
├── public/data/                   # fr.json, uk-london.json, us-nyc.json, nl.json, dk.json
├── scripts/                       # ingest-bdnb, fetch-denmark/london/nyc, recalc-energy-costs
├── src/
│   ├── types/index.ts             # shared Building contract
│   ├── regions/                   # region registry + i18n chrome
│   ├── data/                      # async JSON loader
│   ├── engine/                    # dpe, comfort, scenarios, energyPrice, simulate
│   ├── content/                   # regulation / gestures / heatwave per region
│   ├── components/
│   └── styles/theme.css
└── index.html
```

Single `main` branch; regions switch in-app via `src/regions/index.ts`.

---

## 9. Production data path (post-MVP)

1. Download BDNB open-data extracts (CSV/GeoJSON per department) from data.gouv.fr.
2. `scripts/ingest-bdnb.mjs` maps BDNB columns → `Building` contract, applies enrichers for gaps, tiles output (PMTiles/GeoJSON chunks) for browser loading.
3. Swap the loader's data source — zero component changes.

---

## 10. Traceability matrix (transcript → requirement)

| Transcript passage | Requirement |
|---|---|
| Carte de France, zoom détail, couleur DPE / confort d'été, 2D/3D, "Pour en savoir plus" | FR-1 |
| Barre de recherche d'adresse | FR-2 |
| Descriptif bâtiment (adresse, IDs BDNB/RNB, usage, année, géométrie, logements) | FR-3 Caractéristiques |
| Enveloppe (murs, toiture, planchers, baies, inertie) & systèmes (chauffage, ECS, refroidissement, ventilation, PV) | FR-3 Caractéristiques |
| DPE, consommation annuelle, émissions GES, coût annuel | FR-3 DPE |
| Onglet potentiel, graphique de chapelet, coûts au survol, filtre intelligent | FR-3 Rénovation |
| Degrés-heures d'inconfort 2025/2050/2100, bulles colorées, îlot de chaleur urbain | FR-3 Canicule |
| Connexion, SIREN, bâtiments entourés de vert, double-clic création, enrichisseurs | V2 §4.2 |
| Niveaux BDNB / Audit / Logement, vérification %, 3 voyants, historique, bulles d'aide | V2 §4.2 |
| 3 simulations parallèles (bâtiment, RDC, dernier étage) | V2 §4.2 |
| Résultats synthèse/détaillé, scénarios CRUD, base de gestes, cohérence solaire | V2 §4.2 |
| Météo 2025, projections 2050/2100 (DRIAS) | §3.2 |
