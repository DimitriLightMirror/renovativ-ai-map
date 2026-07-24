import type { CountryConfig } from '../types';

/**
 * United States configuration (usa branch).
 * HERS-style energy rating, USD, English UI, continental US map view.
 */
export const COUNTRY: CountryConfig = {
  code: 'US',
  language: 'en',
  currency: 'USD',
  currencySymbol: '$',
  certificateName: 'HERS Index',
  mapCenter: [39.5, -98.35],
  mapZoom: 5,
  regulationModule: '../content/regulation-us',
};
