import type { CountryConfig } from '../types';

/**
 * France configuration (main branch).
 * UK and USA branches override this file with their own values.
 */
export const COUNTRY: CountryConfig = {
  code: 'FR',
  language: 'fr',
  currency: 'EUR',
  currencySymbol: '€',
  certificateName: 'DPE',
  mapCenter: [43.85, 7.05],
  mapZoom: 9,
  regulationModule: '../content/regulation-fr',
};
