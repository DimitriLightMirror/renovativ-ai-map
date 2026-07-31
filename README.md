# Renovativ AI Map

Carte publique et interactive du parc bâti : diagnostic énergétique (DPE en France),
scénarios de rénovation chiffrés et préparation aux canicules, à l'échelle du bâtiment.
Modèle de données inspiré de la BDNB (Base de Données Nationale des Bâtiments, CSTB).

Voir le cahier des charges complet : [docs/PRD.md](docs/PRD.md).

## Stack

React 18 · TypeScript · Vite · Leaflet · hébergement statique GitHub Pages.

## Scripts

```bash
npm install          # installer les dépendances
npm run dev          # serveur de développement
npm run build        # vérification TypeScript + build de production (dist/)
npm run preview      # prévisualiser le build
npm run ingest:bdnb  # régénérer public/data/fr.json depuis l'export BDNB
```

## Données

Le jeu de données embarqué (`public/data/fr.json`) est issu de la
**BDNB réelle** (Base de Données Nationale des Bâtiments, CSTB), export
open data du **département 06 (Alpes-Maritimes)**, sous
[Licence Ouverte 2.0](https://www.etalab.gouv.fr/licence-ouverte-open-licence).

Pipeline (`scripts/ingest-bdnb.mjs`, streaming ligne à ligne — les CSV
sources ne sont jamais chargés en mémoire) :

1. `batiment_groupe.csv` — géométrie (WKT MULTIPOLYGON, Lambert-93 EPSG:2154) ;
   centroïde surfacique et emprise au sol en m² calculés en Lambert-93, puis
   reprojetés en WGS84 avec proj4 (définition issue de `batiment_groupe.prj`,
   validée sur un point connu d'Aiglun avant conversion de masse).
2. Jointure du DPE représentatif logement (classe, consommation EP, GES,
   systèmes, enveloppe), des attributs Fichiers Fonciers (usage, matériaux,
   nombre de logements) et de la meilleure adresse BAN (fiabilité maximale).
3. **Menton (INSEE 06083) est importée en totalité** (tous les bâtiments
   géoréférencés BDNB, dont **47 Avenue de Sospel**). Les autres communes
   sont plafonnées à 12 000 bâtiments au prorata de leur parc (Nice, Cannes,
   Antibes, Grasse…), priorité aux bâtiments disposant d'un DPE réel.

Champs **modélisés** (non mesurés par la BDNB) :

- `comfort.dh2025/dh2050/dh2100` — cet export ne contient pas d'indicateur de
  confort d'été. Les degrés-heures d'inconfort sont estimés depuis une base
  méditerranéenne à été chaud (~1 600 dh en 2025 pour le 06), ajustée par
  l'inertie, le taux de vitrage, les protections solaires et l'époque de
  construction ; horizons 2050 = ×1,45 et 2100 = ×2,05.
- Bâtiments sans DPE : étiquette estimée par défauts d'époque de construction.
- Valeurs U / isolation d'enveloppe absentes du DPE : défauts d'époque.

Les CSV sources vivent hors du dépôt (`../BDNB/csv`) et ne sont pas versionnés.

## Régions en ligne

- `fr` — France · Alpes-Maritimes 06 (BDNB, DPE, €)
- `uk` — Royaume-Uni · Londres (EPC register, £)
- `us` — États-Unis · New York (LL84 / PLUTO, $)
- `nl` — Pays-Bas · Randstad (PDOK BAG, Energielabel, €) — bâtiments réels
  BAG (adresses, bouwjaar, surfaces) ; étiquettes énergie et attributs
  d'enveloppe modélisés en attendant une clé API EP-online, confort d'été
  modélisé (proxy TOjuli).

Le registre `src/regions/index.ts` pilote le sélecteur de pays, le chargement
des données (`public/data/*.json`) et les contenus de chaque région, sans
modifier le contrat partagé `src/types/index.ts`.

## Déploiement

Le workflow `.github/workflows/deploy.yml` publie `dist/` sur GitHub Pages à
chaque push sur `main` (site projet : base `/renovativ-ai-map/`).
