/**
 * dpe.ts — etiquettes energie par profil de region.
 * France : DPE 2021 (arrete du 31 mars 2021), double critere EP + GES,
 * la classe finale est la plus defavorable des deux.
 * Royaume-Uni : bandes EPC (kWh/m2/an), etiquette sur l'energie seule.
 * Etats-Unis : bandes style HERS (kWh/m2/an), etiquette sur l'energie seule.
 *
 * L'etiquette stockee dans les donnees (certificate.label) est reelle et
 * fait foi pour l'affichage ; ces bandes ne servent qu'au newLabel simule
 * apres renovation.
 */

import type { EnergyLabel } from '../types';

/** Profil de bandes : fr (DPE), uk (EPC), us (HERS), nl (Energielabel). */
export type EngineProfile = 'fr' | 'uk' | 'us' | 'nl';

const LABELS: EnergyLabel[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

/** Seuils hauts par etiquette, kWhEP/m2/an (au-dela => etiquette suivante). */
const EP_THRESHOLDS_FR: readonly number[] = [70, 110, 180, 250, 330, 420];

/** Seuils hauts par etiquette, kgCO2/m2/an (France uniquement). */
const GES_THRESHOLDS_FR: readonly number[] = [6, 11, 30, 50, 70, 100];

/** Bandes EPC Royaume-Uni, kWh/m2/an. */
const EP_THRESHOLDS_UK: readonly number[] = [45, 90, 140, 190, 260, 340];

/** Bandes style HERS pour New York, kWh/m2/an. */
const EP_THRESHOLDS_US: readonly number[] = [55, 70, 85, 100, 115, 130];

/** Bandes Energielabel Pays-Bas (echelle A+++..G repliee sur A..G), kWh/m2/an. */
const EP_THRESHOLDS_NL: readonly number[] = [120, 165, 205, 250, 300, 360];

const EP_THRESHOLDS_BY_PROFILE: Record<EngineProfile, readonly number[]> = {
  fr: EP_THRESHOLDS_FR,
  uk: EP_THRESHOLDS_UK,
  us: EP_THRESHOLDS_US,
  nl: EP_THRESHOLDS_NL,
};

/** Bornes visuelles de la jauge A..G par profil (derniere borne = plafond). */
const GAUGE_BOUNDS_BY_PROFILE: Record<EngineProfile, readonly number[]> = {
  fr: [0, 70, 110, 180, 250, 330, 420, 560],
  uk: [0, 45, 90, 140, 190, 260, 340, 450],
  us: [0, 55, 70, 85, 100, 115, 130, 180],
  nl: [0, 120, 165, 205, 250, 300, 360, 470],
};

/** Couleurs officielles de l'echelle, de A (vert) a G (rouge). */
const LABEL_COLORS: Record<EnergyLabel, string> = {
  A: '#319834',
  B: '#33CC31',
  C: '#CBFC34',
  D: '#FBFE06',
  E: '#FBCC0C',
  F: '#FC9935',
  G: '#FD0205',
};

function labelFromThresholds(value: number, thresholds: readonly number[]): EnergyLabel {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return LABELS[i];
  }
  return 'G';
}

/** Etiquette energie primaire pour une consommation en kWhEP/m2/an. */
export function labelFromEp(ep: number, profile: EngineProfile = 'fr'): EnergyLabel {
  return labelFromThresholds(ep, EP_THRESHOLDS_BY_PROFILE[profile]);
}

/** Etiquette GES pour des emissions en kgCO2/m2/an (barème francais). */
export function labelFromGes(ges: number): EnergyLabel {
  return labelFromThresholds(ges, GES_THRESHOLDS_FR);
}

/** Rang numerique d'une etiquette : A = 0 ... G = 6. */
export function labelRank(label: EnergyLabel): number {
  return LABELS.indexOf(label);
}

/** Etiquette finale : la plus defavorable entre energie et GES. */
export function finalLabel(epLabel: EnergyLabel, gesLabel: EnergyLabel): EnergyLabel {
  return labelRank(epLabel) >= labelRank(gesLabel) ? epLabel : gesLabel;
}

/**
 * Etiquette finale calculee depuis les indicateurs.
 * France : double critere EP + GES. UK/US : energie seule (les bandes
 * EPC/HERS ne sont pas double critere dans ce modele).
 */
export function labelFromIndicators(
  ep: number,
  ges: number,
  profile: EngineProfile = 'fr',
): EnergyLabel {
  if (profile === 'fr') return finalLabel(labelFromEp(ep, 'fr'), labelFromGes(ges));
  return labelFromEp(ep, profile);
}

/** Bornes de la jauge A..G pour un profil donne. */
export function gaugeBounds(profile: EngineProfile = 'fr'): readonly number[] {
  return GAUGE_BOUNDS_BY_PROFILE[profile];
}

/** Couleur d'affichage (echelle officielle). */
export function labelColor(label: EnergyLabel): string {
  return LABEL_COLORS[label];
}
