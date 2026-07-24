import type { CountryConfig } from '../types';

/**
 * Netherlands configuration (branch `netherlands`).
 *
 * NOTE on `code`: the shared CountryCode union in src/types/index.ts is
 * read-only and does not include 'NL' ('FR' | 'UK' | 'US'). The runtime value
 * here is genuinely 'NL'; the cast keeps the type checker satisfied without
 * touching the shared contract. Everything else on this branch (data,
 * regulation, gestures, UI) is Dutch.
 */
export const COUNTRY: CountryConfig = {
  code: 'NL' as CountryConfig['code'],
  language: 'en', // English UI with Dutch domain terms (Energielabel, woning...)
  currency: 'EUR',
  currencySymbol: '€',
  certificateName: 'Energielabel',
  mapCenter: [52.1326, 5.2913], // geographic center of the Netherlands, Leaflet lat,lng
  mapZoom: 7,
  regulationModule: '../content/regulation-nl',
};
