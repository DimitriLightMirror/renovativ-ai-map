/**
 * Dutch regulation corpus (branch `netherlands`).
 * Shown in the Energielabel, Renovation and Heatwave tabs.
 * The `key` values are referenced by renovation gestures and heatwave
 * recommendations. English text, Dutch official titles.
 */

import type { RegulationItem } from '../types';

export const REGULATION_NL: RegulationItem[] = [
  {
    key: 'beg_epbd',
    title: 'Besluit energieprestatie gebouwen (BEG, EPBD implementation)',
    shortName: 'BEG / EPBD',
    summary:
      'The Besluit energieprestatie gebouwen implements the European Energy Performance of Buildings Directive (EPBD) in the Netherlands. It makes an energielabel mandatory when a dwelling or building is sold, rented out or delivered new. Labels are registered in the national EP-online database administered by RVO (Rijksdienst voor Ondernemend Nederland). Since 2021 the energy performance rules themselves live in the Besluit bouwwerken leefomgeving (Bbl); the BEG remains the reference for the label system.',
    obligations: [
      'A registered energielabel is mandatory at sale, at rental and at delivery of a new building.',
      'Labels run from A+++ (best) to G (worst) and are valid for 10 years.',
      'Only a certified energy advisor may register a label in EP-online.',
      'Advertising a home without a valid label can lead to an enforcement fine.',
    ],
    thresholds: [
      { label: 'Scale', value: 'A+++ to G, registered in EP-online (RVO)' },
      { label: 'Validity', value: '10 years from registration' },
      { label: 'Method', value: 'NTA 8800 energy performance calculation' },
    ],
    officialUrl: 'https://wetten.overheid.nl/BWBR0021520',
    relevance: ['certificate', 'renovation'],
  },
  {
    key: 'beng',
    title: 'Bijna Energieneutraal Gebouw (BENG) requirements',
    shortName: 'BENG 1/2/3',
    summary:
      'Since 2021 every new building, and major renovations that trigger a permit, must meet the BENG requirements in the Besluit bouwwerken leefomgeving. Three indicators apply: BENG 1 limits the energy demand of the building, BENG 2 limits primary fossil energy use, and BENG 3 sets a minimum share of renewable energy. New dwellings must also stay below an overheating limit (see TOjuli).',
    obligations: [
      'BENG 1: energy demand below the legal maximum for the building type.',
      'BENG 2: primary fossil energy use below the legal maximum.',
      'BENG 3: minimum share of renewable energy in total use.',
      'New dwellings must pass the TOjuli overheating check.',
    ],
    thresholds: [
      { label: 'BENG 1 (dwellings)', value: 'energy demand at most about 70 kWh/m2 per year' },
      { label: 'BENG 2 (dwellings)', value: 'primary fossil energy at most about 60 kWh/m2 per year' },
      { label: 'BENG 3 (dwellings)', value: 'at least about 50 percent renewable energy' },
      { label: 'Overheating', value: 'TOjuli at most 1.10' },
    ],
    officialUrl: 'https://www.rvo.nl/onderwerpen/wetten-en-regels-gebouwen/bijna-energieneutrale-gebouwen-beng',
    relevance: ['certificate', 'renovation', 'heatwave'],
  },
  {
    key: 'trias_energetica',
    title: 'Trias Energetica (Dutch renovation philosophy)',
    shortName: 'Trias Energetica',
    summary:
      'The Trias Energetica is the standard Dutch design and renovation strategy, applied in three steps. First reduce energy demand through insulation, airtightness and shading. Then cover the remaining demand with sustainable sources such as heat pumps, solar panels and district heating. Only then use fossil energy, as efficiently as possible, for what is left. The renovation scenarios in this app follow the same order.',
    obligations: [
      'Step 1: reduce demand first (roof, wall, floor insulation, glazing, airtightness).',
      'Step 2: supply sustainably (warmtepomp, zonnepanelen, zonneboiler, stadsverwarming).',
      'Step 3: use remaining fossil energy as efficiently as possible.',
    ],
    thresholds: [
      { label: 'Step order', value: 'demand reduction before supply measures' },
      { label: 'Application', value: 'design guideline, embedded in BENG practice' },
    ],
    officialUrl: 'https://www.rvo.nl/onderwerpen/duurzaam-ondernemen/gebouwen/wetten-en-regels-gebouwen',
    relevance: ['renovation'],
  },
  {
    key: 'label_c_rental_2030',
    title: 'Minimum energielabel C voor huurwoningen (2030 target)',
    shortName: 'Label C rental 2030',
    summary:
      'The government has announced a minimum energielabel C for rental homes from 2030: landlords of homes labelled E, F or G would have to renovate before renting them out again. The proposal covers both social and private rentals. In this app, homes labelled E, F or G are flagged as below the 2030 target, the Dutch equivalent of the French passoire thermique.',
    obligations: [
      'From 2030, rental homes should hold at least energielabel C.',
      'Labels E, F and G are below target and need renovation first.',
      'Insulation measures come before heating system replacement in the guidance.',
      'Exceptions are foreseen where renovation is technically or financially unreasonable.',
    ],
    thresholds: [
      { label: 'Target year', value: '2030' },
      { label: 'Minimum label', value: 'C (E, F and G below target)' },
      { label: 'Status', value: 'announced government target, legislation in preparation' },
    ],
    officialUrl: 'https://www.rijksoverheid.nl/onderwerpen/huurwoning/verduurzaming-huurwoningen',
    relevance: ['certificate', 'renovation'],
  },
  {
    key: 'tojuli_nta8800',
    title: 'TOjuli overheating indicator (NTA 8800)',
    shortName: 'TOjuli / NTA 8800',
    summary:
      'Dutch regulation measures summer overheating with TOjuli, the temperatuuroverschrijding in July, defined in the NTA 8800 calculation method. It compares the weighted temperature exceedance of a dwelling against a reference during a standard hot July. New dwellings must stay at or below TOjuli 1.10. There is no national summer comfort indicator for the existing stock comparable to the French degre-heures; this app therefore shows modelled discomfort degree-hours as a proxy, alongside the TOjuli reference.',
    obligations: [
      'New dwellings: TOjuli at most 1.10 under NTA 8800.',
      'Design measures: outside shading (zonwering), night ventilation, glazing solar factor, inertia.',
      'Existing stock: no legal TOjuli limit, used voluntarily as a design check.',
    ],
    thresholds: [
      { label: 'TOjuli limit', value: '1.10 for new dwellings' },
      { label: 'Method', value: 'NTA 8800, standard July climate file' },
      { label: 'Existing stock', value: 'no national comfort indicator, DH shown here is modelled' },
    ],
    officialUrl: 'https://www.rvo.nl/onderwerpen/wetten-en-regels-gebouwen/nta-8800',
    relevance: ['heatwave', 'certificate'],
  },
  {
    key: 'isde',
    title: 'Investeringssubsidie duurzame energie (ISDE)',
    shortName: 'ISDE',
    summary:
      'ISDE is the national subsidy for homeowners (and small business users) who invest in insulation, heat pumps, solar boilers, heat networks or electric cooking. Amounts are fixed per measure and per m2 or unit, published by RVO each year. Indicative 2024-2025 reference amounts: spouwmuur isolation about 5.25 €/m2, roof insulation about 16.25 €/m2, floor insulation about 5.50 €/m2, HR++ glazing about 25 €/m2, triple glazing about 111 €/m2, air-water heat pump from about 2100 €, solar boiler from about 700 €. Two insulation measures combined roughly double the per-m2 rate.',
    obligations: [
      'Application before or within 12 months after the measure, via RVO.',
      'Measures must meet minimum technical requirements (Rd values, appliance lists).',
      'Insulation rates increase when at least two measures are combined.',
      'Homeowner occupancy or landlord ownership both qualify for dwellings.',
    ],
    thresholds: [
      { label: 'Cavity wall', value: 'about 5.25 €/m2 subsidy (2024-2025 reference)' },
      { label: 'Roof insulation', value: 'about 16.25 €/m2 subsidy' },
      { label: 'HR++ glazing', value: 'about 25 €/m2 subsidy' },
      { label: 'Air-water heat pump', value: 'from about 2100 € per unit' },
    ],
    officialUrl: 'https://www.rvo.nl/subsidies-financiering/isde',
    relevance: ['renovation', 'funding'],
  },
  {
    key: 'svn',
    title: 'Subsidie verduurzaming voor Verenigingen van Eigenaars (SVV)',
    shortName: 'SVV (VvE subsidy)',
    summary:
      'The SVV subsidises owners associations (Vereniging van Eigenaars, VvE) that renovate their shared building. It covers energy advice and a renovation roadmap, plus fixed per-measure rates for insulation, glazing and heating measures in the common building stock. Indicative reference rates: cavity wall about 7 €/m2, roof insulation about 30 €/m2, floor insulation about 7.50 €/m2, HR++ glazing about 50 €/m2, plus contributions toward heat pumps in collective systems. Rates are set by RVO and adjusted periodically.',
    obligations: [
      'Applicant must be a registered VvE for a residential building.',
      'Energy advice or a long-term maintenance plan supports the application.',
      'Application before the works start, via RVO.',
      'Combining measures is rewarded with higher rates.',
    ],
    thresholds: [
      { label: 'Cavity wall (VvE)', value: 'about 7 €/m2 subsidy (reference)' },
      { label: 'Roof insulation (VvE)', value: 'about 30 €/m2 subsidy' },
      { label: 'HR++ glazing (VvE)', value: 'about 50 €/m2 subsidy' },
      { label: 'Scope', value: 'shared building envelope and collective systems' },
    ],
    officialUrl: 'https://www.rvo.nl/subsidies-financiering/svv',
    relevance: ['renovation', 'funding'],
  },
];
