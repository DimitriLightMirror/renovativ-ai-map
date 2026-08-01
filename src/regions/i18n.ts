/**
 * regions/i18n.ts — chaines d'interface (chrome) par langue de region.
 * Le contenu metier (reglementation, gestes, recommandations canicule) vit
 * dans les modules de contenu de chaque region ; ici on ne traduit que
 * l'enveloppe : onglets, recherche, legende, statistiques, panneau.
 */

import type { RegionLanguage } from './index';

export interface ChromeStrings {
  header: {
    regionSelectorLabel: string;
    loading: string;
  };
  search: {
    placeholder: string;
    ariaLabel: string;
  };
  stats: {
    ariaLabel: string;
    buildingsMapped: string;
    cities: string;
    ratedForG: string;
  };
  map: {
    ariaLabel: string;
    colorCertificate: string; // remplace le nom court du certificat
    colorComfort: string;
    legendAriaLabel: string;
    colorToggleAriaLabel: string;
    comfortLegend: { color: string; label: string }[];
    horizonNote: string;
    moreInfoShow: string;
    moreInfoHide: string;
    /** Use `{certificate}` placeholder for the regional certificate name. */
    infoCertificate: string;
    infoComfort: string;
    osmAttribution: string;
  };
  panel: {
    ariaLabel: string;
    closeAriaLabel: string;
    tabsAriaLabel: string;
    tabCharacteristics: string;
    tabRenovation: string;
    tabHeatwave: string;
  };
  characteristics: {
    general: string;
    envelope: string;
    systems: string;
    sourcePrefix: string;
    address: string;
    nationalId: string;
    registryId: string;
    usage: string;
    constructionYear: string;
    floorArea: string;
    floors: string;
    height: string;
    housingUnits: string;
    notApplicable: string;
    walls: string;
    insulationWord: string;
    roof: string;
    groundFloor: string;
    glazing: string;
    glazingRatioSuffix: string;
    solarProtection: string;
    present: string;
    absent: string;
    inertia: string;
    mainHeating: string;
    secondaryHeating: string;
    dhw: string;
    cooling: string;
    none: string;
    ventilation: string;
    pv: string;
  };
  certificate: {
    labelsTitle: string;
    energy: string;
    climate: string;
    primaryEnergySuffix: string;
    gesSuffix: string;
    gaugeAriaLabel: string;
    note: string;
    annualTitle: string;
    annualConsumption: string;
    annualEmissions: string;
    annualCost: string;
    annualCostPerM2: string;
    regulationTitle: string;
  };
  renovation: {
    objectiveTitle: string;
    objectiveAriaLabel: string;
    objectives: { comfort: string; energy: string; carbon: string; cost: string };
    chapeletTitle: string;
    chapeletAriaLabel: string;
    chapeletNote: string;
    noGestures: string;
    scenarioTitle: string;
    totalCost: string;
    annualSaving: string;
    payback: string;
    certificateLabel: string;
    summerDiscomfort: string;
    noScenario: string;
    regulationTitle: string;
  };
  heatwave: {
    comfortTitle: string;
    comfortNote: string;
    coolingNotePrefix: string;
    coolingNoteSuffix: string;
    prepTitle: string;
    indicativeCost: string;
    wellPrepared: string;
    regulationTitle: string;
    priorities: { essentiel: string; recommande: string; optionnel: string };
  };
}

const fr: ChromeStrings = {
  header: {
    regionSelectorLabel: 'Choisir un pays',
    loading: 'Chargement des données…',
  },
  search: {
    placeholder: 'Rechercher une adresse, une ville…',
    ariaLabel: 'Rechercher une adresse',
  },
  stats: {
    ariaLabel: 'Statistiques du parc',
    buildingsMapped: 'bâtiments cartographiés',
    cities: 'communes',
    ratedForG: 'classés F ou G',
  },
  map: {
    ariaLabel: 'Carte du parc bâti',
    colorCertificate: 'DPE',
    colorComfort: 'Confort d’été',
    legendAriaLabel: 'Légende de la carte',
    colorToggleAriaLabel: 'Coloration de la carte',
    comfortLegend: [
      { color: '#2E9E5B', label: 'Confortable' },
      { color: '#E3C41C', label: 'Inconfort modéré' },
      { color: '#E8842C', label: 'Inconfort fort' },
      { color: '#D0342C', label: 'Inconfort sévère' },
    ],
    horizonNote: 'Horizon 2050',
    moreInfoShow: 'Pour en savoir plus',
    moreInfoHide: 'Masquer l’explication',
    infoCertificate:
      'Le {certificate} classe chaque bâtiment de A à G selon sa consommation d’énergie et ses émissions de CO2. La classe retenue est en général la moins bonne des deux indicateurs. Les bandes F et G signalent les bâtiments les moins performants, prioritaires pour la rénovation.',
    infoComfort:
      'Le confort d’été mesure les degrés-heures d’inconfort : le cumul des dépassements de température intérieure pendant la saison chaude, sans climatisation. Ici, la projection tient compte du réchauffement attendu en 2050 et de l’îlot de chaleur urbain.',
    osmAttribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributeurs',
  },
  panel: {
    ariaLabel: 'Diagnostic du bâtiment',
    closeAriaLabel: 'Fermer le panneau',
    tabsAriaLabel: 'Onglets du diagnostic',
    tabCharacteristics: 'Caractéristiques',
    tabRenovation: 'Rénovation',
    tabHeatwave: 'Canicule',
  },
  characteristics: {
    general: 'Général',
    envelope: 'Enveloppe',
    systems: 'Systèmes',
    sourcePrefix: 'Source : ',
    address: 'Adresse',
    nationalId: 'Identifiant BDNB',
    registryId: 'Identifiant RNB',
    usage: 'Usage',
    constructionYear: 'Année de construction',
    floorArea: 'Surface de plancher',
    floors: 'Niveaux',
    height: 'Hauteur',
    housingUnits: 'Logements',
    notApplicable: 'Sans objet',
    walls: 'Murs',
    insulationWord: 'isolation',
    roof: 'Toiture',
    groundFloor: 'Plancher bas',
    glazing: 'Baies et vitrage',
    glazingRatioSuffix: '% de surface vitrée',
    solarProtection: 'Protections solaires',
    present: 'Présentes',
    absent: 'Absentes',
    inertia: 'Inertie',
    mainHeating: 'Chauffage principal',
    secondaryHeating: 'Chauffage secondaire',
    dhw: 'Eau chaude sanitaire',
    cooling: 'Refroidissement',
    none: 'Aucun',
    ventilation: 'Ventilation',
    pv: 'Photovoltaïque',
  },
  certificate: {
    labelsTitle: 'Étiquettes',
    energy: 'Énergie',
    climate: 'Climat (GES)',
    primaryEnergySuffix: 'd’énergie primaire',
    gesSuffix: 'de gaz à effet de serre',
    gaugeAriaLabel: 'Classe énergie',
    note:
      'Consommation d’énergie primaire rapportée à la surface de plancher. La classe finale est la moins bonne des deux étiquettes.',
    annualTitle: 'Chiffres annuels',
    annualConsumption: 'Consommation annuelle',
    annualEmissions: 'Émissions annuelles',
    annualCost: 'Coût énergétique annuel',
    annualCostPerM2: 'Coût annuel par m²',
    regulationTitle: 'Réglementation applicable',
  },
  renovation: {
    objectiveTitle: 'Objectif de rénovation',
    objectiveAriaLabel: 'Objectif de rénovation',
    objectives: { comfort: 'Confort d’été', energy: 'Énergie', carbon: 'Carbone', cost: 'Coût' },
    chapeletTitle: 'Graphique de chapelet',
    chapeletAriaLabel: 'Classement des gestes de rénovation',
    chapeletNote:
      'Les 10 gestes les plus pertinents pour cet objectif, notés sur 100. Survolez une barre pour le détail du geste et son retour sur investissement.',
    noGestures: 'Aucun geste applicable à ce bâtiment pour cet objectif.',
    scenarioTitle: 'Scénario recommandé',
    totalCost: 'Coût total estimé',
    annualSaving: 'Économie annuelle',
    payback: 'Retour sur investissement',
    certificateLabel: 'Étiquette DPE',
    summerDiscomfort: 'Inconfort d’été 2050',
    noScenario: 'Aucun scénario disponible pour cet objectif.',
    regulationTitle: 'Réglementation et aides',
  },
  heatwave: {
    comfortTitle: 'Confort d’été à trois horizons',
    comfortNote:
      'Degrés-heures d’inconfort par été, sans climatisation. Les projections 2050 et 2100 tiennent compte du réchauffement et de l’îlot de chaleur urbain.',
    coolingNotePrefix: 'Ce bâtiment dispose déjà d’un refroidissement : ',
    coolingNoteSuffix:
      '. Les mesures passives restent prioritaires pour limiter la consommation.',
    prepTitle: 'Préparation aux canicules',
    indicativeCost: 'Coût indicatif : ',
    wellPrepared: 'Ce bâtiment est déjà bien préparé aux épisodes chauds.',
    regulationTitle: 'Réglementation applicable',
    priorities: { essentiel: 'Essentiel', recommande: 'Recommandé', optionnel: 'Optionnel' },
  },
};

const en: ChromeStrings = {
  header: {
    regionSelectorLabel: 'Choose a country',
    loading: 'Loading data…',
  },
  search: {
    placeholder: 'Search for an address or city…',
    ariaLabel: 'Search an address',
  },
  stats: {
    ariaLabel: 'Building stock statistics',
    buildingsMapped: 'buildings mapped',
    cities: 'cities',
    ratedForG: 'in the lowest bands (F–G)',
  },
  map: {
    ariaLabel: 'Building stock map',
    colorCertificate: 'Certificate',
    colorComfort: 'Summer comfort',
    legendAriaLabel: 'Map legend',
    colorToggleAriaLabel: 'Map colouring',
    comfortLegend: [
      { color: '#2E9E5B', label: 'Comfortable' },
      { color: '#E3C41C', label: 'Moderate discomfort' },
      { color: '#E8842C', label: 'Strong discomfort' },
      { color: '#D0342C', label: 'Severe discomfort' },
    ],
    horizonNote: '2050 horizon',
    moreInfoShow: 'Learn more',
    moreInfoHide: 'Hide the explanation',
    infoCertificate:
      'The {certificate} rates each building from A to G from its energy use and carbon emissions. The worst performers (typically F and G) are the first targets for renovation.',
    infoComfort:
      'Summer comfort is measured in discomfort degree-hours: the cumulated excess of indoor temperature over the warm season, without air conditioning. The projection shown here accounts for the warming expected by 2050 and the urban heat island.',
    osmAttribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  panel: {
    ariaLabel: 'Building diagnostic',
    closeAriaLabel: 'Close the panel',
    tabsAriaLabel: 'Diagnostic tabs',
    tabCharacteristics: 'Characteristics',
    tabRenovation: 'Renovation',
    tabHeatwave: 'Heatwave',
  },
  characteristics: {
    general: 'General',
    envelope: 'Envelope',
    systems: 'Systems',
    sourcePrefix: 'Source: ',
    address: 'Address',
    nationalId: 'National database ID',
    registryId: 'Registry ID',
    usage: 'Usage',
    constructionYear: 'Construction year',
    floorArea: 'Floor area',
    floors: 'Floors',
    height: 'Height',
    housingUnits: 'Housing units',
    notApplicable: 'n/a',
    walls: 'Walls',
    insulationWord: 'insulation',
    roof: 'Roof',
    groundFloor: 'Ground floor',
    glazing: 'Windows and glazing',
    glazingRatioSuffix: '% glazed area',
    solarProtection: 'Solar protection',
    present: 'Present',
    absent: 'Absent',
    inertia: 'Thermal inertia',
    mainHeating: 'Main heating',
    secondaryHeating: 'Secondary heating',
    dhw: 'Domestic hot water',
    cooling: 'Cooling',
    none: 'None',
    ventilation: 'Ventilation',
    pv: 'Solar PV',
  },
  certificate: {
    labelsTitle: 'Ratings',
    energy: 'Energy',
    climate: 'Climate (GHG)',
    primaryEnergySuffix: 'of energy use',
    gesSuffix: 'of greenhouse gas emissions',
    gaugeAriaLabel: 'Energy rating',
    note:
      'Energy use per square metre of floor area. The final rating is the worst of the energy and climate scores.',
    annualTitle: 'Annual figures',
    annualConsumption: 'Annual consumption',
    annualEmissions: 'Annual emissions',
    annualCost: 'Annual energy cost',
    annualCostPerM2: 'Annual cost per m²',
    regulationTitle: 'Applicable regulation',
  },
  renovation: {
    objectiveTitle: 'Renovation objective',
    objectiveAriaLabel: 'Renovation objective',
    objectives: { comfort: 'Summer comfort', energy: 'Energy', carbon: 'Carbon', cost: 'Cost' },
    chapeletTitle: 'Measure ranking',
    chapeletAriaLabel: 'Renovation measure ranking',
    chapeletNote:
      'The 10 most relevant measures for this objective, scored out of 100. Hover a bar for the measure detail and its payback.',
    noGestures: 'No applicable measure for this building and objective.',
    scenarioTitle: 'Recommended package',
    totalCost: 'Estimated total cost',
    annualSaving: 'Annual saving',
    payback: 'Payback',
    certificateLabel: 'Energy rating',
    summerDiscomfort: 'Summer discomfort 2050',
    noScenario: 'No package available for this objective.',
    regulationTitle: 'Regulation and funding',
  },
  heatwave: {
    comfortTitle: 'Summer comfort across three horizons',
    comfortNote:
      'Discomfort degree-hours per summer, without air conditioning. The 2050 and 2100 projections account for warming and the urban heat island.',
    coolingNotePrefix: 'This building already has cooling: ',
    coolingNoteSuffix: '. Passive measures remain the priority to limit energy use.',
    prepTitle: 'Heatwave preparation',
    indicativeCost: 'Indicative cost: ',
    wellPrepared: 'This building is already well prepared for hot spells.',
    regulationTitle: 'Applicable regulation',
    priorities: { essentiel: 'Essential', recommande: 'Recommended', optionnel: 'Optional' },
  },
};

// Les regions uk, us, nl et dk utilisent toutes le chrome anglais : le
// dictionnaire est indexe par langue (RegionLanguage), pas par region.
// Le nom de region, la devise (kr., locale da-DK) et le disclaimer danois
// vivent dans la config dk de regions/index.ts ; les contenus metier dans
// src/content/*-dk.ts. Aucune entree dk n'est donc requise ici (meme
// precedent que nl, dont le commit n'a ajoute aucune entree au dictionnaire).
const DICTS: Record<RegionLanguage, ChromeStrings> = { fr, en };

export function stringsFor(language: RegionLanguage): ChromeStrings {
  return DICTS[language];
}

// ---------------------------------------------------------------------------
// Ajout (I1_Scenario_Costs) : note de dimensionnement des pompes a chaleur.
// Append uniquement, aucune cle existante modifiee.
// ---------------------------------------------------------------------------

/** Note affichee sous le cout d'un geste PAC : puissance dimensionnee sur le batiment. */
export function heatPumpSizingNote(language: RegionLanguage, capacityKW: number): string {
  const kw = Math.round(capacityKW);
  return language === 'fr'
    ? `PAC dimensionnée sur ~${kw} kW pour ce bâtiment`
    : `Heat pump sized at ~${kw} kW for this building`;
}
