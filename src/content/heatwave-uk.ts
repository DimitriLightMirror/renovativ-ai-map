/**
 * Heatwave preparation recommendations, UK pathway.
 * The `trigger` field uses the shared DSL over Building paths;
 * an empty string means the recommendation is always relevant.
 * indicativeCostEUR: indicative range for a typical home or office floor,
 * pounds sterling 2025 (field name kept from the shared contract).
 */

import type { HeatwaveRecommendation } from '../types';

export const HEATWAVE_RECS_UK: HeatwaveRecommendation[] = [
  {
    id: 'occultations_exterieures',
    title: 'Fit external shading on exposed windows',
    description:
      'External blinds, awnings or shutters on south, east and west facing windows. Closed before the sun hits the glass, they block most of the solar gain. The most effective measure against overheating, in line with the passive-first approach of Approved Document O.',
    trigger: 'envelope.solarProtection=false',
    priority: 'essentiel',
    regulationRefs: ['ukhsa_heat_health_plan', 'approved_document_o'],
    indicativeCostEUR: [600, 4000],
  },
  {
    id: 'ventilation_nocturne',
    title: 'Organise night ventilation',
    description:
      'Open windows wide at night once outdoor air turns cooler than indoor air, then close up by day. In flats and workplaces, plan secure openings or mechanical purge ventilation driven by a temperature sensor, as encouraged by the free area rules of Approved Document O.',
    trigger: 'systems.cooling=null',
    priority: 'essentiel',
    regulationRefs: ['ukhsa_heat_health_plan', 'approved_document_o'],
    indicativeCostEUR: [0, 2500],
  },
  {
    id: 'brasseurs_air',
    title: 'Fit ceiling fans in lived-in rooms',
    description:
      'A ceiling fan improves the felt temperature by 2 to 3 °C for very little electricity. An effective backup when indoor temperatures pass 26 °C, recommended in heat-health guidance.',
    trigger: 'systems.hasCeilingFans=false',
    priority: 'essentiel',
    regulationRefs: ['ukhsa_heat_health_plan'],
    indicativeCostEUR: [200, 900],
  },
  {
    id: 'isolation_toiture',
    title: 'Insulate the roof',
    description:
      'The roof takes the strongest solar load of the day. Topping up loft or flat roof insulation sharply reduces overheating of the top floor, while improving winter performance at the same time.',
    trigger: 'constructionYear<1975',
    priority: 'recommande',
    regulationRefs: ['part_l', 'ukhsa_heat_health_plan'],
    indicativeCostEUR: [1500, 8000],
  },
  {
    id: 'cool_roof',
    title: 'Treat the flat roof as a cool roof',
    description:
      'A light-coloured high-reflectance coating bounces solar radiation back instead of absorbing it. The roof surface temperature can drop by 20 to 30 °C in full sun, which directly relieves the top floor.',
    trigger: 'envelope.roofType=terrasse',
    priority: 'recommande',
    regulationRefs: ['approved_document_o', 'ukhsa_heat_health_plan'],
    indicativeCostEUR: [1200, 6500],
  },
  {
    id: 'toiture_vegetalisee',
    title: 'Green the flat roof',
    description:
      'An extensive green roof tempers heat through evapotranspiration and protects the waterproofing from thermal cycling. Best planned during a roof renewal, after a structural check.',
    trigger: 'envelope.roofType=terrasse',
    priority: 'optionnel',
    regulationRefs: ['approved_document_o', 'ukhsa_heat_health_plan'],
    indicativeCostEUR: [3500, 16000],
  },
  {
    id: 'vegetation_cadueque',
    title: 'Plant deciduous trees in front of south-facing windows',
    description:
      'Trees and planted pergolas shade the high summer sun and let the low winter sun through. A long-term solution, to combine with blinds while the plants grow.',
    trigger: 'usage=residential_individual',
    priority: 'optionnel',
    regulationRefs: ['ukhsa_heat_health_plan'],
    indicativeCostEUR: [400, 2500],
  },
  {
    id: 'films_solaires',
    title: 'Apply solar control films to the glazing',
    description:
      'Reflective films applied to exposed glazing. A quick and affordable option where external shading is impossible, for example in leasehold flats. Less effective than an external blind.',
    trigger: 'envelope.solarProtection=false',
    priority: 'recommande',
    regulationRefs: ['ukhsa_heat_health_plan'],
    indicativeCostEUR: [250, 1600],
  },
  {
    id: 'vmc_double_flux_bypass',
    title: 'Install heat recovery ventilation with a summer bypass',
    description:
      'Mechanical ventilation with heat recovery supplies fresh air with windows closed, and the bypass allows night over-ventilation without the heat exchanger. Useful on noisy or polluted urban streets where opening windows is difficult.',
    trigger: 'systems.ventilation!=vmc_double_flux',
    priority: 'recommande',
    regulationRefs: ['approved_document_o', 'part_l'],
    indicativeCostEUR: [2800, 5500],
  },
  {
    id: 'reduction_apports_internes',
    title: 'Cut internal heat gains during hot spells',
    description:
      'Shift oven, washing machine and computer use to the cooler hours, switch off standby devices and move lighting to LED. Free measures to apply as soon as a yellow heat-health alert is issued.',
    trigger: '',
    priority: 'essentiel',
    regulationRefs: ['ukhsa_heat_health_plan'],
    indicativeCostEUR: [0, 150],
  },
  {
    id: 'pieces_fraiches',
    title: 'Provide a cool room and drinking water in shared areas',
    description:
      'In blocks of flats and workplaces, identify or create a cool room accessible to occupants, with a water point. A heat-health plan recommendation for buildings that host vulnerable people.',
    trigger: 'usage!=residential_individual',
    priority: 'recommande',
    regulationRefs: ['ukhsa_heat_health_plan'],
    indicativeCostEUR: [400, 4000],
  },
  {
    id: 'rideaux_occultants',
    title: 'Hang thermal curtains until external shading is fitted',
    description:
      'Light-coloured thermal curtains closed by day on the sun side. A stopgap: the glass still heats up, but the gain reaching the room is delayed. Replace with external shading when possible.',
    trigger: 'envelope.solarProtection=false',
    priority: 'optionnel',
    regulationRefs: ['ukhsa_heat_health_plan'],
    indicativeCostEUR: [80, 500],
  },
];
