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
  mapCenter: [46.7, 2.5],
  mapZoom: 6,
  regulationModule: '../content/regulation-fr',
};
