/**
 * Recommandations de préparation aux vagues de chaleur, parcours France.
 * Le champ `trigger` utilise le DSL partagé sur les chemins de Building ;
 * chaîne vide = recommandation toujours pertinente.
 * indicativeCostEUR : fourchette indicative pour un logement ou un plateau
 * tertiaire type, euros TTC 2025.
 */

import type { HeatwaveRecommendation } from '../types';

export const HEATWAVE_RECS_FR: HeatwaveRecommendation[] = [
  {
    id: 'occultations_exterieures',
    title: 'Installer des occultations extérieures sur les baies exposées',
    description:
      'Stores extérieurs, volets ou brise-soleil sur les façades sud, est et ouest. Fermés avant que le soleil ne frappe le vitrage, ils bloquent l’essentiel des apports. C’est la mesure la plus efficace contre la surchauffe.',
    trigger: 'envelope.solarProtection=false',
    priority: 'essentiel',
    regulationRefs: ['plan_canicule', 're2020'],
    indicativeCostEUR: [800, 5000],
  },
  {
    id: 'ventilation_nocturne',
    title: 'Organiser la ventilation nocturne',
    description:
      'Ouvrir largement la nuit quand l’air extérieur devient plus frais que l’air intérieur, fermer le jour. En collectif et en tertiaire, prévoir des ouvrants sécurisés ou une surventilation motorisée pilotée sur sonde de température.',
    trigger: 'systems.cooling=null',
    priority: 'essentiel',
    regulationRefs: ['plan_canicule', 're2020'],
    indicativeCostEUR: [0, 3000],
  },
  {
    id: 'brasseurs_air',
    title: 'Équiper les pièces de brasseurs d’air',
    description:
      'Un brasseur de plafond améliore la sensation de confort de 2 à 3 °C pour une consommation électrique très faible. Solution de secours efficace quand les températures intérieures dépassent 26 °C.',
    trigger: 'systems.hasCeilingFans=false',
    priority: 'essentiel',
    regulationRefs: ['plan_canicule'],
    indicativeCostEUR: [300, 1500],
  },
  {
    id: 'isolation_toiture',
    title: 'Isoler la toiture',
    description:
      'Le toit reçoit le rayonnement le plus intense de la journée. Une isolation renforcée de la toiture ou des combles réduit fortement la surchauffe du dernier niveau, tout en améliorant la performance hivernale.',
    trigger: 'constructionYear<1975',
    priority: 'recommande',
    regulationRefs: ['re2020', 'plan_canicule'],
    indicativeCostEUR: [2000, 12000],
  },
  {
    id: 'cool_roof',
    title: 'Traiter la toiture en cool roof',
    description:
      'Un revetement clair à forte réflectance renvoie le rayonnement solaire au lieu de l’absorber. La température de surface de la toiture peut baisser de 20 à 30 °C en plein soleil, ce qui soulage directement le dernier étage.',
    trigger: 'envelope.roofType=terrasse',
    priority: 'recommande',
    regulationRefs: ['re2020', 'plan_canicule'],
    indicativeCostEUR: [1500, 8000],
  },
  {
    id: 'toiture_vegetalisee',
    title: 'Végétaliser la toiture terrasse',
    description:
      'Une toiture végétalisée extensive tempère la chaleur par évapotranspiration et protège l’étanchéité des cycles thermiques. À prévoir lors d’une réfection de toiture, après vérification de la structure porteuse.',
    trigger: 'envelope.roofType=terrasse',
    priority: 'optionnel',
    regulationRefs: ['re2020', 'plan_canicule'],
    indicativeCostEUR: [4000, 20000],
  },
  {
    id: 'vegetation_cadueque',
    title: 'Planter une végétation caduque devant les baies sud',
    description:
      'Arbres et pergolas végétalisées masquent le soleil d’été et laissent passer celui d’hiver. Solution long terme, à combiner avec des occultations en attendant la croissance des plants.',
    trigger: 'usage=residential_individual',
    priority: 'optionnel',
    regulationRefs: ['plan_canicule'],
    indicativeCostEUR: [500, 3000],
  },
  {
    id: 'films_solaires',
    title: 'Poser des films solaires sur les vitrages',
    description:
      'Films réfléchissants appliqués sur les vitrages exposés. Solution rapide et abordable quand aucune protection extérieure n’est possible, notamment en copropriété. Moins efficace qu’un store extérieur.',
    trigger: 'envelope.solarProtection=false',
    priority: 'recommande',
    regulationRefs: ['plan_canicule'],
    indicativeCostEUR: [300, 2000],
  },
  {
    id: 'vmc_double_flux_bypass',
    title: 'Installer une VMC double flux avec bypass d’été',
    description:
      'La double flux assure un renouvellement d’air maîtrisé fenêtres fermées, et le bypass permet de surventiler la nuit sans passer par l’échangeur. Utile en zone urbaine bruyante ou polluée où l’ouverture des fenêtres est difficile.',
    trigger: 'systems.ventilation!=vmc_double_flux',
    priority: 'recommande',
    regulationRefs: ['re2020', 'plan_canicule'],
    indicativeCostEUR: [3000, 6000],
  },
  {
    id: 'reduction_apports_internes',
    title: 'Réduire les apports internes pendant les épisodes chauds',
    description:
      'Reporter l’usage du four, du lave-linge et des équipements informatiques aux heures fraîches, éteindre les appareils en veille, passer l’éclairage aux LED. Mesures gratuites à appliquer dès la vigilance jaune.',
    trigger: '',
    priority: 'essentiel',
    regulationRefs: ['plan_canicule'],
    indicativeCostEUR: [0, 200],
  },
  {
    id: 'pieces_fraiches',
    title: 'Prévoir une pièce fraîche et des points d’eau dans les parties communes',
    description:
      'En résidentiel collectif et en tertiaire, identifier ou créer une pièce rafraîchie accessible aux occupants, avec fontaine ou point d’eau. Recommandation du plan canicule pour les bâtiments recevant des publics fragiles.',
    trigger: 'usage!=residential_individual',
    priority: 'recommande',
    regulationRefs: ['plan_canicule'],
    indicativeCostEUR: [500, 5000],
  },
  {
    id: 'rideaux_occultants',
    title: 'Ajouter des rideaux occultants en attendant des protections extérieures',
    description:
      'Rideaux thermiques clairs fermés le jour côté soleil. Solution provisoire de dépannage : le vitrage chauffe quand même, mais l’apport vers la pièce est retardé. À remplacer à terme par une protection extérieure.',
    trigger: 'envelope.solarProtection=false',
    priority: 'optionnel',
    regulationRefs: ['plan_canicule'],
    indicativeCostEUR: [100, 600],
  },
];
