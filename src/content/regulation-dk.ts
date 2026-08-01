/**
 * Danish regulation corpus (Denmark region).
 * Shown in the Energimaerke, Renovation and Heatwave tabs.
 * The `key` values are referenced by renovation gestures and heatwave
 * recommendations. English text, Danish official titles.
 * All officialUrl values verified live (HTTP 200) in 2025/2026.
 */

import type { RegulationItem } from '../types';

export const REGULATION_DK: RegulationItem[] = [
  {
    key: 'energimaerkning',
    title: 'Energimærkningsordningen (mandatory energy labelling scheme)',
    shortName: 'Energimærket',
    summary:
      'The Energimærkningsordningen is the Danish implementation of the European Energy Performance of Buildings Directive. An energimærke is mandatory when a building is sold, rented out or newly built. Labels run from A2020, A2015 and A2010 (best, tied to the building code vintage) down through B, C, D, E, F to G (worst). Certificates are issued by an accredited energy consultant (energikonsulent) and registered in the national EMO database administered by Energistyrelsen (the Danish Energy Agency).',
    obligations: [
      'A valid energimærke is mandatory at sale, at rental and for new buildings.',
      'Labels run from A2020/A2015/A2010 (best) to G (worst).',
      'Only an accredited energikonsulent may issue and register a certificate.',
      'Certificates are valid for 10 years from registration.',
    ],
    thresholds: [
      { label: 'Scale', value: 'A2020, A2015, A2010, then B to G' },
      { label: 'Validity', value: '10 years from registration' },
      { label: 'Administrator', value: 'Energistyrelsen (Danish Energy Agency)' },
    ],
    officialUrl: 'https://ens.dk/ansvarsomraader/energibesparelser',
    relevance: ['certificate', 'renovation'],
  },
  {
    key: 'br18',
    title: 'Bygningsreglementet BR18 (building code energy requirements)',
    shortName: 'BR18',
    summary:
      'Bygningsreglementet BR18 sets the energy frame (energirammen) for new buildings and for major renovations and change of use, verified by the Be18 calculation. Whenever a building element is renovated, minimum U-value requirements apply where the upgrade is profitable within three quarters of its lifetime, so re-roofing or re-cladding normally triggers mandatory insulation. BR18 also sets thermal indoor climate requirements for new dwellings, limiting summer overtemperature through shading, glazing properties and ventilation design.',
    obligations: [
      'New buildings: total energy need within the energiramme (Be18 calculation).',
      'Renovated elements must meet minimum U-values where profitable.',
      'Re-roofing triggers loft insulation when the payback test passes.',
      'New dwellings must document summer thermal indoor climate (overtemperature check).',
    ],
    thresholds: [
      { label: 'New dwellings', value: 'energy frame around 30 kWh/m2 per year (BR18 class)' },
      { label: 'Renovation rule', value: 'minimum U-values when profitable within 3/4 of lifetime' },
      { label: 'Method', value: 'Be18 energy calculation' },
      { label: 'Summer comfort', value: 'thermal indoor climate check for new dwellings' },
    ],
    officialUrl: 'https://bygningsreglementet.dk',
    relevance: ['certificate', 'renovation', 'heatwave'],
  },
  {
    key: 'epbd',
    title: 'EPBD implementation in Denmark (Energy Performance of Buildings Directive)',
    shortName: 'EPBD',
    summary:
      'Denmark implements the European EPBD through the energimaerkning scheme and the Bygningsreglementet. The recast directive (EU) 2024/1275 raises the bar: member states must cut the average primary energy use of the residential stock by at least 16 percent by 2030 and 20 to 22 percent by 2035, with 55 percent of the reduction delivered in the worst-performing buildings. For Denmark that means the energimaerke E, F and G stock is the legal renovation priority, with minimum performance standards following in the national implementation.',
    obligations: [
      'National renovation plans must target the worst-labelled stock first.',
      'Residential stock average primary energy: minus 16 percent by 2030.',
      '55 percent of the reduction must come from the worst buildings.',
      'New buildings must be zero-emission ready under the recast timeline.',
    ],
    thresholds: [
      { label: '2030 target', value: 'minus 16 percent average residential primary energy' },
      { label: '2035 target', value: 'minus 20 to 22 percent' },
      { label: 'Priority stock', value: 'worst-performing buildings (E, F, G in Danish terms)' },
    ],
    officialUrl: 'https://energy.ec.europa.eu/topics/energy-efficiency/energy-efficient-buildings/energy-performance-buildings-directive_en',
    relevance: ['certificate', 'renovation'],
  },
  {
    key: 'emo_tiltaksplan',
    title: 'EMO register and the tiltaksplan (renovation plan)',
    shortName: 'EMO / tiltaksplan',
    summary:
      'Every registered energimærke lives in EMO (Energimærkning Online), the national label register operated by Energistyrelsen. Each certificate holds the address, BBR building reference, label classification, heated floor area and a tiltaksplan: a list of concrete renovation proposals with estimated investment cost and annual saving in DKK. The register is publicly searchable by address on tjekenergimærke.emoweb.dk, and its EMOData API is the data source behind the Danish buildings shown in this app.',
    obligations: [
      'All energimærke certificates are registered centrally in EMO.',
      'Each certificate includes a tiltaksplan with costed improvement proposals.',
      'Expired labels must be renewed before a sale or rental is advertised.',
      'The register is open to the public for address-level lookup.',
    ],
    thresholds: [
      { label: 'Operator', value: 'Energistyrelsen, public lookup on emoweb.dk' },
      { label: 'Content', value: 'label, BBR reference, area, tiltaksplan with costs in DKK' },
      { label: 'Access', value: 'public register and EMOData API' },
    ],
    officialUrl: 'https://tjekenergimaerke.emoweb.dk/',
    relevance: ['certificate', 'renovation'],
  },
  {
    key: 'klimaaftale',
    title: 'Klimaloven and Klimaaftale om grøn strøm og varme',
    shortName: 'Klimaaftale',
    summary:
      'The Danish Climate Act (Klimaloven, 2020) commits Denmark to a 70 percent greenhouse gas reduction by 2030 against 1990 and climate neutrality by 2050. The climate agreement on green electricity and heat (Klimaaftale om grøn strøm og varme, 2022) turns this into building-sector action: phasing out oil and gas boilers, rolling out heat pumps and district heating, and replacing the old Bygningspuljen subsidy with the two current pools, Energirenoveringspuljen and Varmepumpepuljen. Buildings labelled E, F and G are the political focus of renovation programmes.',
    obligations: [
      'National target: 70 percent emission reduction by 2030 (Klimaloven).',
      'Building sector: fossil boiler phase-out and heat pump rollout.',
      'Renovation priority on the E, F and G labelled stock.',
      'Municipalities prepare heat plans shifting homes to district heating or heat pumps.',
    ],
    thresholds: [
      { label: '2030 target', value: '70 percent reduction vs 1990 (Klimaloven)' },
      { label: '2050 target', value: 'climate neutrality' },
      { label: 'Priority stock', value: 'energimærke E, F and G' },
    ],
    officialUrl: 'https://www.retsinformation.dk/eli/lta/2020/965',
    relevance: ['renovation', 'certificate'],
  },
  {
    key: 'fjernvarme',
    title: 'Fjernvarme (district heating) and the fossil boiler phase-out',
    shortName: 'Fjernvarme',
    summary:
      'District heating supplies around two thirds of Danish homes and is the backbone of the heat transition. Municipal heat plans (kommunale varmeplaner) designate where homes must convert from individual oil or gas boilers to fjernvarme or to individual heat pumps. Since 2013 new oil boilers may not be installed where district heating or natural gas is available, and gas areas are being converted zone by zone. In this app, homes on oil or gas are flagged with the two standard conversion routes: fjernvarme where the network reaches, varmepumpe elsewhere.',
    obligations: [
      'No new oil boiler installations where district heating or gas is available.',
      'Municipal heat plans assign each area to fjernvarme or heat pumps.',
      'Gas boiler phase-out advances area by area through conversion projects.',
      'Scrapped oil boilers may not be replaced by new fossil boilers.',
    ],
    thresholds: [
      { label: 'Coverage', value: 'district heating supplies about 2/3 of Danish homes' },
      { label: 'Oil boiler ban', value: 'in force since 2013 for new installations' },
      { label: 'Planning instrument', value: 'kommunale varmeplaner (municipal heat plans)' },
    ],
    officialUrl: 'https://ens.dk/ansvarsomraader/varme',
    relevance: ['renovation'],
  },
  {
    key: 'energirenoveringspuljen',
    title: 'Energirenoveringspuljen (energy renovation subsidy pool)',
    shortName: 'Energirenoveringspuljen',
    summary:
      'Energirenoveringspuljen is the current national subsidy pool for energy renovation of year-round homes, replacing the closed Bygningspuljen. It subsidises insulation, window replacement, ventilation systems and hydronic (water-borne) space heating, plus the energimærke itself. Eligibility requires a valid energimærke D, E, F or G (label D added from February 2025). Works must be carried out by a company with a CVR number and must not start before the grant is approved. The pool opens in rounds and funds are allocated first come, first served.',
    obligations: [
      'Home must be a year-round dwelling (helårsbolig) owned by the applicant.',
      'Valid energimærke D, E, F or G is required for envelope measures.',
      'Works may not start before the grant approval (forhåndsgodkendelse).',
      'Work must be invoiced by a company with a valid CVR number, no DIY.',
    ],
    thresholds: [
      { label: 'Measures', value: 'insulation, windows, ventilation, hydronic heating, energimærke' },
      { label: 'Eligibility', value: 'energimærke D, E, F or G (D since 2025)' },
      { label: 'Status', value: 'recurring rounds, first come first served' },
    ],
    officialUrl: 'https://sparenergi.dk/energirenoveringspuljen',
    relevance: ['renovation', 'funding'],
  },
  {
    key: 'varmepumpepuljen',
    title: 'Varmepumpepuljen (heat pump subsidy pool)',
    shortName: 'Varmepumpepuljen',
    summary:
      'Varmepumpepuljen pays a fixed grant to owners of year-round homes who replace an oil boiler, gas boiler, electric heating or pellet stove with an air-to-water or ground-source heat pump. No energimærke is required to apply, and the grant must be approved before signing with the installer. Reference amounts: 17,000 kr per conversion in the 2025 rounds, raised to 27,000 kr in the 2026 round. Homes inside district heating areas are directed to fjernvarme conversion instead, so the pool targets the off-network stock.',
    obligations: [
      'Applicant must own a year-round home (helårsbolig).',
      'Replaces oil, gas, electric or pellet heating with a heat pump.',
      'Grant approval required before any contract with the installer.',
      'Not available inside district heating areas, where fjernvarme applies.',
    ],
    thresholds: [
      { label: 'Grant 2025', value: '17.000 kr. per heat pump conversion' },
      { label: 'Grant 2026', value: '27.000 kr. per conversion' },
      { label: 'Heat pump cost', value: 'air-to-water typically 80.000–165.000 kr. installed' },
    ],
    officialUrl: 'https://sparenergi.dk/privat/soeg-tilskud/varm-op-til-soege-tilskud-til-en-varmepumpe',
    relevance: ['renovation', 'funding'],
  },
];
