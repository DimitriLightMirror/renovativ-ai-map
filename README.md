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
npm run generate:data # régénérer l'échantillon de bâtiments (scripts/generate-buildings.mjs)
```

## Stratégie de branches

- `main` — France (BDNB, DPE, €)
- `uk` — Royaume-Uni (EPC register, £)
- `usa` — États-Unis (HERS Index, $)

Chaque branche remplace `src/config/country.ts`, le corpus réglementaire
(`src/content/`) et le jeu de données, sans modifier le contrat partagé
`src/types/index.ts`.

## Déploiement

Le workflow `.github/workflows/deploy.yml` publie `dist/` sur GitHub Pages à
chaque push sur `main` (site projet : base `/renovativ-ai-map/`).
