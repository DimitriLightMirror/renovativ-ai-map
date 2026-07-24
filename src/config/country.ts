import type { CountryConfig } from '../types';

/**
 * United Kingdom configuration (uk branch).
 * Overrides the France configuration from main.
 */
export const COUNTRY: CountryConfig = {
  code: 'UK',
  language: 'en',
  currency: 'GBP',
  currencySymbol: '£',
  certificateName: 'EPC',
  mapCenter: [54.0, -2.5],
  mapZoom: 6,
  regulationModule: '../content/regulation-uk',
};
