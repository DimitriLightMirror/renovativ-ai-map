/**
 * UK regulation corpus.
 * Content shown in the EPC, Renovation and Heatwave tabs.
 * The keys (`key`) are referenced by gestures and heatwave recommendations.
 */

import type { RegulationItem } from '../types';

export const REGULATION_UK: RegulationItem[] = [
  {
    key: 'epc_framework',
    title: 'Energy Performance Certificates and Minimum Energy Efficiency Standards',
    shortName: 'EPC / MEES',
    summary:
      'An Energy Performance Certificate rates a building from A (most efficient) to G (least efficient) using the SAP or RdSAP methodology. An EPC is required whenever a home is built, sold or let, and is valid for 10 years. Since April 2020, the Minimum Energy Efficiency Standards make it unlawful to let a domestic property rated below EPC band E, unless a valid exemption is registered.',
    obligations: [
      'EPC required on construction, sale or rental of any dwelling or commercial building.',
      'Certificates are lodged on the national EPC register and valid for 10 years.',
      'Since April 2020, privately rented homes must reach at least EPC band E.',
      'Landlords of F or G rated homes must improve the property or register an exemption.',
    ],
    thresholds: [
      { label: 'Band A', value: '92 to 100 SAP points' },
      { label: 'Band B', value: '81 to 91 SAP points' },
      { label: 'Band C', value: '69 to 80 SAP points' },
      { label: 'Band D', value: '55 to 68 SAP points' },
      { label: 'Band E', value: '39 to 54 SAP points' },
      { label: 'Band F', value: '21 to 38 SAP points' },
      { label: 'Band G', value: '1 to 20 SAP points' },
      { label: 'MEES minimum for rentals', value: 'EPC band E since April 2020' },
    ],
    officialUrl: 'https://www.gov.uk/buy-sell-your-home/energy-performance-certificates',
    relevance: ['certificate', 'renovation'],
  },
  {
    key: 'part_l',
    title: 'Building Regulations Part L: Conservation of fuel and power',
    shortName: 'Part L 2021',
    summary:
      'Approved Document L sets the energy performance requirements for new and existing buildings in England. The 2021 edition tightened the fabric and system standards and introduced a 31 % carbon reduction for new homes compared with the 2013 baseline. For work on existing buildings it sets minimum U-values for replaced or renovated thermal elements.',
    obligations: [
      'New homes must cut carbon emissions by about 31 % against the 2013 standard.',
      'Replacement windows, boilers and renovated walls or roofs must meet minimum efficiency standards.',
      'New thermal elements and major renovations must reach the limiting U-values of Approved Document L.',
      'Compliance is demonstrated through SAP calculations and notified to building control.',
    ],
    thresholds: [
      { label: 'New homes carbon target', value: '31 % below the 2013 Part L baseline' },
      { label: 'New external wall', value: 'U-value of 0.26 W/m²K or better' },
      { label: 'Replacement window', value: 'U-value of 1.4 W/m²K or better' },
      { label: 'New or replacement roof', value: 'U-value of 0.16 W/m²K or better' },
    ],
    officialUrl: 'https://www.gov.uk/government/publications/conservation-of-fuel-and-power-approved-document-l',
    relevance: ['renovation'],
  },
  {
    key: 'approved_document_o',
    title: 'Approved Document O: Overheating mitigation',
    shortName: 'Document O',
    summary:
      'Approved Document O applies to new residential buildings in England since June 2022. It requires overheating risk to be limited through passive measures: caps on glazed area, minimum free area for purge ventilation, and control of solar gains, so that homes stay safe without mechanical cooling.',
    obligations: [
      'Overheating risk must be assessed for every new dwelling, by the simplified method or dynamic thermal modelling.',
      'Maximum glazed areas apply according to orientation and location, with stricter limits in high-risk areas such as London.',
      'Minimum free area for purge ventilation must be provided to dump heat at night.',
      'Mechanical cooling may only be used once passive measures prove insufficient.',
    ],
    thresholds: [
      { label: 'Glazing limit, high-risk location', value: 'up to 13 % of floor area for a west or south facing cross-ventilated home' },
      { label: 'Glazing limit, other locations', value: 'up to 18 % of floor area for a west or south facing cross-ventilated home' },
      { label: 'Purge ventilation', value: 'minimum free area set per room and orientation' },
    ],
    officialUrl: 'https://www.gov.uk/government/publications/overheating-approved-document-o',
    relevance: ['heatwave', 'renovation'],
  },
  {
    key: 'future_homes_standard',
    title: 'Future Homes and Buildings Standard',
    shortName: 'Future Homes Standard',
    summary:
      'The Future Homes and Buildings Standard, applicable from 2025, requires new homes and buildings in England to produce 75 to 80 % less carbon than under the 2013 standards. New homes are designed around low-carbon heating, very high fabric standards and, where relevant, on-site renewables, so that no retrofit work is needed to reach net zero operation.',
    obligations: [
      'New homes must emit 75 to 80 % less carbon than the 2013 Part L baseline.',
      'Heating systems must be low carbon, effectively ending gas boilers in new homes.',
      'Fabric performance must meet notional building U-values set by the standard.',
      'Real performance must be demonstrated through SAP and evidenced at completion.',
    ],
    thresholds: [
      { label: 'Carbon reduction', value: '75 to 80 % below the 2013 standard' },
      { label: 'Heating', value: 'low-carbon systems such as heat pumps or heat networks' },
    ],
    officialUrl: 'https://www.gov.uk/government/consultations/the-future-homes-and-buildings-standards-2023-consultation',
    relevance: ['renovation'],
  },
  {
    key: 'eco4',
    title: 'Energy Company Obligation, fourth phase',
    shortName: 'ECO4',
    summary:
      'ECO4 obliges large energy suppliers to fund energy efficiency improvements in the homes of low-income and vulnerable households. The scheme targets the least efficient homes, rated EPC D to G, and funds whole-house packages: insulation first, then heating upgrades including heat pumps, delivered against a minimum improvement in SAP points.',
    obligations: [
      'Funded by large energy suppliers under a statutory obligation, running to March 2026.',
      'Targeted at owner-occupied and private rented homes in EPC bands D to G, occupied by eligible low-income or vulnerable households.',
      'Measures must achieve a minimum uplift in SAP points, assessed by a retrofit coordinator.',
      'Installers must be TrustMark registered and work to PAS 2035 standards.',
    ],
    thresholds: [
      { label: 'Eligible homes', value: 'EPC bands D to G with an eligible household' },
      { label: 'Minimum uplift', value: 'EPC band improvement set per starting band' },
      { label: 'Delivery standard', value: 'PAS 2035 with TrustMark registration' },
    ],
    officialUrl: 'https://www.gov.uk/government/publications/energy-company-obligation-eco4-2022-to-2026',
    relevance: ['renovation', 'funding'],
  },
  {
    key: 'great_british_insulation_scheme',
    title: 'Great British Insulation Scheme',
    shortName: 'GBIS',
    summary:
      'The Great British Insulation Scheme funds single insulation measures, mainly cavity wall and loft insulation, in less efficient homes. It complements ECO4 by covering a broader group of households, including council tax bands A to D in England, not only low-income households.',
    obligations: [
      'One subsidised insulation measure per home, installed by an obligated supplier or its installer.',
      'Open to homes in lower council tax bands with an EPC of D or below.',
      'Low-income group eligible for fully funded measures; general group may pay a contribution.',
      'Measures installed to TrustMark and PAS 2030 standards.',
    ],
    thresholds: [
      { label: 'General group', value: 'council tax bands A to D in England, EPC D to G' },
      { label: 'Low-income group', value: 'means-tested benefits, fully funded measures' },
    ],
    officialUrl: 'https://www.gov.uk/apply-great-british-insulation-scheme',
    relevance: ['renovation', 'funding'],
  },
  {
    key: 'boiler_upgrade_scheme',
    title: 'Boiler Upgrade Scheme',
    shortName: 'BUS',
    summary:
      'The Boiler Upgrade Scheme provides an upfront grant to replace a fossil fuel boiler with a low-carbon heating system in England and Wales. The grant of £7 500 applies to air source and ground source heat pumps, paid to the installer and deducted from the quote, so the homeowner pays the balance.',
    obligations: [
      'Grant of £7 500 for an air source or ground source heat pump, £5 000 for a biomass boiler in eligible rural homes.',
      'Property must have a valid EPC with no outstanding loft or cavity wall insulation recommendations, or an exemption.',
      'The installer applies for the grant on behalf of the owner and passes it on as a discount.',
      'System must be installed by an MCS certified installer and meet minimum efficiency standards.',
    ],
    thresholds: [
      { label: 'Heat pump grant', value: '£7 500 off the installation cost' },
      { label: 'EPC condition', value: 'no outstanding loft or cavity wall recommendation' },
      { label: 'Installer', value: 'MCS certification required' },
    ],
    officialUrl: 'https://www.gov.uk/apply-boiler-upgrade-scheme',
    relevance: ['renovation', 'funding'],
  },
  {
    key: 'ukhsa_heat_health_plan',
    title: 'Adverse Weather and Health Plan and Heat-Health Alerts',
    shortName: 'Heat-Health Plan',
    summary:
      'The UK Health Security Agency runs the Adverse Weather and Health Plan with the Met Office. The Heat-Health Alert service operates from June to September and warns the health and social care sector when high temperatures are forecast. Guidance covers keeping homes cool: shading windows, ventilating at night and checking on vulnerable people.',
    obligations: [
      'Heat-Health Alerts run on four levels, from green (preparedness) to red (emergency response), issued with the Met Office.',
      'Yellow alerts trigger readiness actions in health and social care settings; amber requires targeted action for high-risk groups.',
      'Care providers must keep indoor areas cool and identify cool rooms for residents.',
      'Households are advised to shade sun-facing windows, ventilate at cooler times and limit internal heat sources.',
    ],
    thresholds: [
      { label: 'Green', value: 'summer preparedness and long-term planning' },
      { label: 'Yellow', value: 'response actions for health and social care' },
      { label: 'Amber', value: 'significant impacts likely across the whole population' },
      { label: 'Red', value: 'emergency response, risk to life for fit and healthy people' },
    ],
    officialUrl: 'https://www.gov.uk/government/publications/adverse-weather-and-health-plan',
    relevance: ['heatwave'],
  },
];
