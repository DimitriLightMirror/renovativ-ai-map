/**
 * engine/index.ts — point d'entree du moteur de calcul Renovativ.
 * TypeScript pur, sans dependance runtime.
 */

export {
  labelFromEp,
  labelFromGes,
  finalLabel,
  labelFromIndicators,
  labelRank,
  labelColor,
  gaugeBounds,
} from './dpe';
export type { EngineProfile } from './dpe';

export { classifyDh, comfortForHorizons } from './comfort';
export type { ComfortLevel, ComfortClassification, ComfortHorizons } from './comfort';

export {
  ENERGY_PRICE_EUR_PER_KWH,
  MAX_COMBINED_REDUCTION,
  evaluateApplicability,
  relevantSurface,
  estimateCost,
  combineWithRequires,
  paybackYears,
  scoreForObjective,
  rankGestures,
} from './scenarios';
export type { ApplicabilityCheck, EngineOptions } from './scenarios';

export { simulateScenario, suggestBestPackage, MAX_PACKAGE_GESTURES } from './simulate';
export type { SimulationResult, PackageSuggestion } from './simulate';
