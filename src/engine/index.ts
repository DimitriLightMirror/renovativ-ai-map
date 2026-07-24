/**
 * engine/index.ts — entry point of the Renovativ calculation engine.
 * Pure TypeScript, no runtime dependency.
 */

export {
  labelFromEp,
  labelFromGes,
  finalLabel,
  labelFromIndicators,
  labelRank,
  labelColor,
} from './dpe';

export { classifyDh, comfortForHorizons } from './comfort';
export type { ComfortLevel, ComfortClassification, ComfortHorizons } from './comfort';

export {
  ENERGY_PRICE_GBP_PER_KWH,
  MAX_COMBINED_REDUCTION,
  evaluateApplicability,
  relevantSurface,
  estimateCost,
  combineWithRequires,
  paybackYears,
  scoreForObjective,
  rankGestures,
} from './scenarios';
export type { ApplicabilityCheck } from './scenarios';

export { simulateScenario, suggestBestPackage, MAX_PACKAGE_GESTURES } from './simulate';
export type { SimulationResult, PackageSuggestion } from './simulate';
