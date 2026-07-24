/**
 * Heatwave preparation recommendations, Netherlands (branch `netherlands`).
 * Framed around reducing TOjuli (the NTA 8800 overheating indicator) for a
 * maritime climate that is getting warmer. The `trigger` field uses the
 * shared DSL over Building paths; empty string means always relevant.
 * indicativeCostEUR: indicative range per dwelling or typical office floor,
 * 2025 EUR, approximations pending verified pricing.
 */

import type { HeatwaveRecommendation } from '../types';

export const HEATWAVE_RECS_NL: HeatwaveRecommendation[] = [
  {
    id: 'buitenzonwering',
    title: 'Install outside shading (buitenzonwering) on exposed windows',
    description:
      'External screens, blinds or shutters on south, east and west facades, closed before the sun reaches the glass. The single most effective TOjuli reduction measure for the existing Dutch stock, where outside shading is still rare.',
    trigger: 'envelope.solarProtection=false',
    priority: 'essentiel',
    regulationRefs: ['tojuli_nta8800', 'beng'],
    indicativeCostEUR: [800, 4500],
  },
  {
    id: 'nachtventilatie',
    title: 'Organise night ventilation (nachtventilatie)',
    description:
      'Open windows and vents wide at night once outdoor air is cooler than indoor air, close them during the day. In apartment buildings use secure vents or a mechanical night purge controlled on temperature. Free to cheap, and directly cuts the weighted temperature exceedance behind TOjuli.',
    trigger: 'systems.cooling=null',
    priority: 'essentiel',
    regulationRefs: ['tojuli_nta8800'],
    indicativeCostEUR: [0, 2500],
  },
  {
    id: 'plafondventilatoren',
    title: 'Fit ceiling fans (plafondventilatoren)',
    description:
      'A ceiling fan improves perceived comfort by 2 to 3 °C for a few watts of electricity. The Dutch backup measure when indoor temperatures pass 26 °C, without installing air conditioning.',
    trigger: 'systems.hasCeilingFans=false',
    priority: 'essentiel',
    regulationRefs: ['tojuli_nta8800'],
    indicativeCostEUR: [250, 1200],
  },
  {
    id: 'dakisolatie_zomer',
    title: 'Insulate the roof for summer',
    description:
      'The roof takes the strongest sun of the day. Roof insulation, standard in every Dutch renovation, shields the top floor from overheating while paying back in winter. Priority for pre-1975 homes and all top-floor dwellings under a flat roof.',
    trigger: 'constructionYear<1975',
    priority: 'recommande',
    regulationRefs: ['tojuli_nta8800', 'isde'],
    indicativeCostEUR: [2500, 11000],
  },
  {
    id: 'groen_dak',
    title: 'Green the flat roof (groen dak)',
    description:
      'A sedum roof cools by evaporation and protects the roofing from thermal cycling. Combine with a planned roof renewal after a structural check. Many municipalities subsidise green roofs.',
    trigger: 'envelope.roofType=terrasse',
    priority: 'recommande',
    regulationRefs: ['tojuli_nta8800'],
    indicativeCostEUR: [3000, 15000],
  },
  {
    id: 'wit_dak',
    title: 'Apply a white or cool roof finish (wit dak)',
    description:
      'A light, high-reflectance roof surface can run 20 to 30 °C cooler in full sun, which relieves the top floor directly. Cheap per m2, no winter benefit, ideal for large flat roofs on galerijflats and offices.',
    trigger: 'envelope.roofType=terrasse',
    priority: 'recommande',
    regulationRefs: ['tojuli_nta8800'],
    indicativeCostEUR: [1000, 6000],
  },
  {
    id: 'zonwerend_glas_folie',
    title: 'Add solar control film or glass where shading is impossible',
    description:
      'Reflective film or zonwerend glas on exposed panes when outside shading cannot be fitted, common in VvE buildings with facade rules. Less effective than buitenzonwering but quick and affordable.',
    trigger: 'envelope.solarProtection=false',
    priority: 'recommande',
    regulationRefs: ['tojuli_nta8800'],
    indicativeCostEUR: [300, 2500],
  },
  {
    id: 'groene_gevel_bomen',
    title: 'Plant deciduous green against sun-facing facades',
    description:
      'Trees, climbing plants and green pergolas shade summer sun and pass winter sun. A long-term TOjuli measure for ground-level homes; combine with shading while plants grow.',
    trigger: 'usage=residential_individual',
    priority: 'optionnel',
    regulationRefs: ['tojuli_nta8800'],
    indicativeCostEUR: [400, 3000],
  },
  {
    id: 'wtw_zomerbypass',
    title: 'Balanced ventilation (WTW) with summer bypass',
    description:
      'A WTW unit refreshes air with windows closed, useful on noisy or polluted streets, and the summer bypass purges heat at night without passing the heat exchanger.',
    trigger: 'systems.ventilation!=vmc_double_flux',
    priority: 'recommande',
    regulationRefs: ['tojuli_nta8800', 'beng'],
    indicativeCostEUR: [3000, 5500],
  },
  {
    id: 'hittebronnen_beperken',
    title: 'Limit internal heat sources during hot spells',
    description:
      'Shift oven, dishwasher, washing machine and server use to cool hours, switch devices off instead of standby, use LED lighting. Free measures that lower the indoor temperature peak.',
    trigger: '',
    priority: 'essentiel',
    regulationRefs: ['tojuli_nta8800'],
    indicativeCostEUR: [0, 150],
  },
  {
    id: 'koele_ruimte',
    title: 'Provide a cool room in shared buildings',
    description:
      'In apartment buildings, schools and offices, designate a cool room with water points for vulnerable occupants during heatwaves. Follows the national heat plan guidance for buildings with fragile users.',
    trigger: 'usage!=residential_individual',
    priority: 'recommande',
    regulationRefs: ['tojuli_nta8800'],
    indicativeCostEUR: [300, 4000],
  },
  {
    id: 'gordijnen_tijdelijk',
    title: 'Use light-coloured curtains as a temporary measure',
    description:
      'Closed light curtains on the sunny side delay heat entry while waiting for real outside shading. A stopgap only: the glass still heats up. Replace with buitenzonwering when possible.',
    trigger: 'envelope.solarProtection=false',
    priority: 'optionnel',
    regulationRefs: ['tojuli_nta8800'],
    indicativeCostEUR: [80, 500],
  },
];
