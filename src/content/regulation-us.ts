/**
 * US regulatory and incentive corpus (usa branch).
 * Shown in the HERS Index, Renovation and Heat Preparation tabs.
 * Keys (`key`) are referenced by renovation gestures and heatwave recommendations.
 */

import type { RegulationItem } from '../types';

export const REGULATION_US: RegulationItem[] = [
  {
    key: 'hers_index',
    title: 'RESNET Home Energy Rating System (HERS) Index',
    shortName: 'HERS Index',
    summary:
      'The HERS Index, maintained by RESNET, is the US industry standard for rating a home\'s energy efficiency. A score of 100 represents the energy use of a new home built to the 2006 International Energy Conservation Code, and a score of 0 is a net zero energy home. Each one-point change is roughly one percent of the reference home\'s energy use. Typical existing homes score between 120 and 150, so most of the older stock has a large efficiency gap to close.',
    obligations: [
      'Ratings are performed by certified RESNET HERS Raters using accredited software.',
      'The HERS Index is required for ENERGY STAR home certification and many green mortgage products.',
      'Several states and utilities tie rebates and code compliance paths to a verified HERS score.',
      'Lower is better: every point below 100 is about one percent saved against the reference new home.',
    ],
    thresholds: [
      { label: 'Score 100', value: 'energy use of the 2006 IECC reference new home' },
      { label: 'Score 0', value: 'net zero energy home' },
      { label: 'Typical existing home', value: 'score between 120 and 150' },
      { label: 'ENERGY STAR certified', value: 'about 15 to 20 percent better than the reference home' },
    ],
    officialUrl: 'https://www.energy.gov/energysaver/home-energy-assessments',
    relevance: ['certificate', 'renovation'],
  },
  {
    key: 'iecc_2021',
    title: 'International Energy Conservation Code (IECC) 2021',
    shortName: 'IECC 2021',
    summary:
      'The IECC is the model energy code for residential and commercial buildings in the United States, adopted state by state with local amendments. The 2021 edition improves envelope insulation, window performance, air tightness and duct sealing by roughly 9 percent over the 2018 edition. It maps its requirements to the eight DOE climate zones, from zone 1 (very hot, Miami) to zone 8 (subarctic, Alaska), so insulation and glazing targets differ by location.',
    obligations: [
      'New construction and major renovations must meet the envelope and systems requirements of the locally adopted IECC edition.',
      'Prescriptive insulation R-values and window U-factors are set per DOE climate zone 1 through 8.',
      'Air leakage is limited to 3 to 5 air changes per hour at 50 Pa, verified by blower door test.',
      'Ducts in unconditioned space must be sealed and insulated, with leakage testing for new systems.',
    ],
    thresholds: [
      { label: 'Climate zones', value: 'DOE zones 1 (very hot) to 8 (subarctic)' },
      { label: 'Air tightness', value: '3 to 5 ACH50 depending on climate zone' },
      { label: 'Attic insulation', value: 'R-38 to R-60 depending on climate zone' },
      { label: 'Efficiency gain', value: 'about 9 percent better than IECC 2018' },
    ],
    officialUrl: 'https://www.energy.gov/eere/buildings/energy-codes',
    relevance: ['renovation'],
  },
  {
    key: 'ashrae_90_1',
    title: 'ASHRAE Standard 90.1 (commercial buildings)',
    shortName: 'ASHRAE 90.1',
    summary:
      'ASHRAE Standard 90.1 sets minimum energy efficiency requirements for commercial and high-rise residential buildings. It is the commercial counterpart of the IECC and is referenced by building codes across the country. The standard covers the building envelope, HVAC, service water heating, power and lighting, with both prescriptive paths and an energy cost budget method for whole-building performance.',
    obligations: [
      'Commercial buildings must meet envelope, HVAC and lighting minimum efficiencies at permitting.',
      'Large buildings follow either the prescriptive path or a whole-building energy cost budget method.',
      'Continuous air barrier, daylighting controls and economizers are required above defined size thresholds.',
      'State energy codes for commercial buildings are benchmarked against Standard 90.1 editions.',
    ],
    thresholds: [
      { label: 'Scope', value: 'commercial buildings and residential buildings over three stories' },
      { label: 'Compliance paths', value: 'prescriptive requirements or energy cost budget method' },
      { label: 'Lighting', value: 'maximum lighting power density per space type' },
    ],
    officialUrl: 'https://www.energy.gov/eere/buildings/energy-codes',
    relevance: ['certificate', 'renovation'],
  },
  {
    key: 'energy_star',
    title: 'ENERGY STAR certification and products',
    shortName: 'ENERGY STAR',
    summary:
      'ENERGY STAR is the federal labeling program for energy efficient products, homes and buildings, run by the EPA and DOE. Certified new homes are at least 15 to 20 percent more efficient than code-built homes. The program also certifies heat pumps, windows, water heaters, smart thermostats and appliances, and rates commercial buildings on a 1 to 100 benchmark score through Portfolio Manager.',
    obligations: [
      'Certified homes must achieve a verified HERS score better than the ENERGY STAR reference design.',
      'Product certification requires independent testing against published efficiency specifications.',
      'Commercial buildings scoring 75 or more in Portfolio Manager can earn ENERGY STAR certification.',
      'Many utility rebates and the federal 25C tax credit reference ENERGY STAR specifications.',
    ],
    thresholds: [
      { label: 'Certified home', value: 'at least 15 to 20 percent better than a code-built home' },
      { label: 'Heat pump credit eligibility', value: 'must meet ENERGY STAR or CEE efficiency tiers' },
      { label: 'Commercial benchmark', value: 'score of 75 or more out of 100 for certification' },
    ],
    officialUrl: 'https://www.energystar.gov/',
    relevance: ['renovation'],
  },
  {
    key: 'ira_25c',
    title: 'Energy Efficient Home Improvement Credit (IRA section 25C)',
    shortName: '25C tax credit',
    summary:
      'The Inflation Reduction Act of 2022 expanded the section 25C tax credit. Homeowners can claim 30 percent of the cost of qualifying efficiency upgrades, capped at 1 200 dollars per year for most measures, with a separate 2 000 dollar annual cap for heat pumps and heat pump water heaters. The credit resets every year through 2032, so a staged renovation can claim it several times. A home energy audit also qualifies for up to 150 dollars.',
    obligations: [
      'Credit equals 30 percent of qualifying costs, claimed on the annual federal tax return.',
      'Annual cap of 1 200 dollars for envelope measures, windows, doors and audits combined.',
      'Separate annual cap of 2 000 dollars for heat pumps, heat pump water heaters and biomass stoves.',
      'Equipment must meet ENERGY STAR or CEE efficiency specifications; insulation must meet IECC criteria.',
    ],
    thresholds: [
      { label: 'Envelope, windows, audit', value: '30 percent credit, 1 200 dollars per year cap' },
      { label: 'Heat pumps and HPWH', value: '30 percent credit, 2 000 dollars per year cap' },
      { label: 'Home energy audit', value: 'up to 150 dollars' },
      { label: 'Availability', value: 'tax years 2023 through 2032' },
    ],
    officialUrl: 'https://www.irs.gov/credits-deductions/energy-efficient-home-improvement-credit',
    relevance: ['renovation', 'funding'],
  },
  {
    key: 'ira_25d_homes_heehra',
    title: 'Residential Clean Energy Credit (25D) and HOMES / HEEHRA rebates',
    shortName: '25D and rebates',
    summary:
      'Section 25D provides a 30 percent tax credit for rooftop solar, geothermal heat pumps, battery storage and solar water heating, with no annual cap. Alongside it, the IRA created two rebate programs run by state energy offices: HOMES pays for whole-home retrofits that deliver modeled or measured energy savings of 20 percent or more, and HEEHRA gives point-of-sale rebates to low and moderate income households for electrification, including up to 8 000 dollars for a heat pump and 1 750 dollars for a heat pump water heater.',
    obligations: [
      '25D credit equals 30 percent of installed cost for solar PV, geothermal and battery storage.',
      'HOMES rebates scale with achieved energy savings, doubled for low income households.',
      'HEEHRA rebates are point-of-sale and reserved for households below 150 percent of area median income.',
      'Rebates cannot be stacked for the same measure, but can combine with tax credits per IRS rules.',
    ],
    thresholds: [
      { label: '25D credit', value: '30 percent, no annual cap, through 2032' },
      { label: 'HOMES retrofit rebate', value: 'up to 4 000 or 8 000 dollars depending on income and savings' },
      { label: 'HEEHRA heat pump', value: 'up to 8 000 dollars point-of-sale' },
      { label: 'HEEHRA heat pump water heater', value: 'up to 1 750 dollars point-of-sale' },
    ],
    officialUrl: 'https://www.energy.gov/save/home-energy-rebates',
    relevance: ['renovation', 'funding'],
  },
  {
    key: 'fema_noaa_extreme_heat',
    title: 'FEMA and NOAA extreme heat guidance, NWS heat alerts',
    shortName: 'Extreme heat guidance',
    summary:
      'Extreme heat is the deadliest weather hazard in the United States. The National Weather Service issues heat advisories, excessive heat watches and excessive heat warnings based on forecast heat index values. FEMA and NOAA recommend preparing homes ahead of heat season: shade windows, service air conditioning, identify a cool room, and locate public cooling centers for households without cooling. The Heat.gov portal consolidates the federal guidance.',
    obligations: [
      'NWS issues heat advisories and excessive heat warnings when the heat index crosses regional thresholds.',
      'Local governments open cooling centers during excessive heat events; locations are published by county emergency management.',
      'Building owners housing vulnerable people should plan shaded or cooled rooms and backup power for outages.',
      'Employers and building managers must plan for heat stress risks during prolonged heat waves.',
    ],
    thresholds: [
      { label: 'Heat advisory', value: 'heat index typically 100 to 104 degrees F for two days or more' },
      { label: 'Excessive heat warning', value: 'heat index typically 105 degrees F or higher' },
      { label: 'Cooling centers', value: 'opened by counties and cities during excessive heat events' },
    ],
    officialUrl: 'https://www.weather.gov/safety/heat',
    relevance: ['heatwave'],
  },
];
