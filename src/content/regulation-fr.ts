/**
 * Corpus réglementaire français.
 * Contenu affiché dans les onglets DPE, Rénovation et Canicule.
 * Les clés (`key`) servent de références pour les gestes et les recommandations canicule.
 */

import type { RegulationItem } from '../types';

export const REGULATION_FR: RegulationItem[] = [
  {
    key: 'dpe_2021',
    title:
      'Diagnostic de performance énergétique réformé (arrêté du 31 mars 2021)',
    shortName: 'DPE 2021',
    summary:
      'Depuis le 1er juillet 2021, le DPE est opposable et calcule la classe du logement sur deux critères : la consommation d’énergie primaire et les émissions de gaz à effet de serre. La classe retenue est la moins bonne des deux. L’étiquette va de A (très performant) à G (passoire thermique).',
    obligations: [
      'DPE obligatoire à la vente et à la location de tout logement ou bâtiment tertiaire.',
      'Le DPE est opposable : l’acquéreur ou le locataire peut engager la responsabilité du vendeur en cas d’erreur.',
      'Validité de 10 ans, mais les DPE réalisés entre 2013 et 2017 ne sont plus valables depuis 2023.',
      'La classe finale est la moins bonne des deux étiquettes énergie et climat.',
    ],
    thresholds: [
      { label: 'Classe A, énergie', value: 'EP inférieure ou égale à 70 kWhEP/m²/an' },
      { label: 'Classe B, énergie', value: 'EP de 71 à 110 kWhEP/m²/an' },
      { label: 'Classe C, énergie', value: 'EP de 111 à 180 kWhEP/m²/an' },
      { label: 'Classe D, énergie', value: 'EP de 181 à 250 kWhEP/m²/an' },
      { label: 'Classe E, énergie', value: 'EP de 251 à 330 kWhEP/m²/an' },
      { label: 'Classe F, énergie', value: 'EP de 331 à 420 kWhEP/m²/an' },
      { label: 'Classe G, énergie', value: 'EP supérieure à 420 kWhEP/m²/an' },
      { label: 'Classe A, climat', value: 'GES inférieurs ou égaux à 6 kgCO2/m²/an' },
      { label: 'Classe B, climat', value: 'GES de 7 à 11 kgCO2/m²/an' },
      { label: 'Classe C, climat', value: 'GES de 12 à 30 kgCO2/m²/an' },
      { label: 'Classe D, climat', value: 'GES de 31 à 50 kgCO2/m²/an' },
      { label: 'Classe E, climat', value: 'GES de 51 à 70 kgCO2/m²/an' },
      { label: 'Classe F, climat', value: 'GES de 71 à 100 kgCO2/m²/an' },
      { label: 'Classe G, climat', value: 'GES supérieurs à 100 kgCO2/m²/an' },
    ],
    officialUrl: 'https://www.ecologie.gouv.fr/diagnostic-performance-energetique-dpe',
    relevance: ['certificate', 'renovation'],
  },
  {
    key: 're2020',
    title: 'Réglementation environnementale 2020',
    shortName: 'RE2020',
    summary:
      'La RE2020 encadre la construction neuve. Elle ajoute à l’exigence d’efficacité énergétique une exigence de confort d’été : le bâtiment doit limiter l’inconfort estival sans recours à la climatisation. L’indicateur retenu est le degré-heure d’inconfort, cumul des dépassements de température intérieure sur la saison chaude.',
    obligations: [
      'Respect d’un seuil de degrés-heures d’inconfort pour tout bâtiment neuf.',
      'Calcul du confort d’été sur un scénario climatique de réchauffement, pas seulement sur la météo actuelle.',
      'Le dépassement du seuil peut être admis si le porteur de projet justifie des mesures compensatoires (inertie, protections solaires, surventilation nocturne).',
      'Ces principes sont la référence pour évaluer la préparation du parc existant aux canicules.',
    ],
    thresholds: [
      { label: 'Degrés-heures d’inconfort', value: 'seuil de référence de 1250 °C.h par été, modulable selon le projet' },
      { label: 'Horizon climatique', value: 'scénario de réchauffement à moyen terme pour le calcul réglementaire' },
    ],
    officialUrl: 'https://www.ecologie.gouv.fr/reglementation-environnementale-re2020',
    relevance: ['renovation', 'heatwave'],
  },
  {
    key: 'decret_tertiaire',
    title:
      'Dispositif Éco Énergie Tertiaire (décret tertiaire, décret n° 2019-771 du 23 juillet 2019)',
    shortName: 'Décret tertiaire',
    summary:
      'Tout bâtiment tertiaire de plus de 1000 m² doit réduire ses consommations d’énergie selon une trajectoire obligatoire par rapport à une année de référence. Les résultats se déclarent chaque année sur la plateforme OPERAT. Les propriétaires et locataires sont solidairement tenus de l’obligation.',
    obligations: [
      'Réduction des consommations de 40 % en 2030, 50 % en 2040 et 60 % en 2050 par rapport à l’année de référence, ou atteinte d’un niveau de consommation absolu fixé par arrêté.',
      'Déclaration annuelle des consommations sur la plateforme OPERAT.',
      'Transmission du dossier lors de la vente ou de la location du bâtiment.',
      'Sanctions possibles en cas de non-déclaration : publication et amende.',
    ],
    thresholds: [
      { label: 'Périmètre', value: 'bâtiments tertiaires de plus de 1000 m²' },
      { label: 'Échéance 2030', value: 'moins 40 % de consommation finale' },
      { label: 'Échéance 2040', value: 'moins 50 % de consommation finale' },
      { label: 'Échéance 2050', value: 'moins 60 % de consommation finale' },
    ],
    officialUrl: 'https://www.ecologie.gouv.fr/dispositif-eco-energie-tertiaire',
    relevance: ['certificate', 'renovation'],
  },
  {
    key: 'audit_energetique_obligatoire',
    title:
      'Audit énergétique obligatoire à la vente des passoires thermiques',
    shortName: 'Audit obligatoire',
    summary:
      'Depuis le 1er avril 2023, la vente d’une maison individuelle classée F ou G impose au vendeur de fournir un audit énergétique. Ce document décrit un scénario de rénovation en une étape et un scénario par étapes, avec les coûts et les gains attendus pour atteindre la classe B.',
    obligations: [
      'Audit à la charge du vendeur pour toute maison individuelle classée F ou G.',
      'Document remis à l’acquéreur avant la signature de l’acte de vente.',
      'L’audit propose au moins deux scénarios : rénovation en une étape et rénovation par étapes compatibles entre elles.',
      'Extension prévue aux classes E à partir de 2025 selon le calendrier de la loi Climat et Résilience.',
    ],
    thresholds: [
      { label: 'Déclencheur', value: 'maison individuelle classée F ou G au DPE' },
      { label: 'Cible du scénario', value: 'atteinte de la classe B en rénovation complète' },
    ],
    officialUrl: 'https://france-renov.gouv.fr/audit-energetique',
    relevance: ['certificate', 'renovation'],
  },
  {
    key: 'interdiction_location',
    title:
      'Interdiction progressive de location des passoires thermiques (loi Climat et Résilience)',
    shortName: 'Interdictions de location',
    summary:
      'La loi Climat et Résilience retire progressivement du marché locatif les logements les moins performants. Depuis 2023, un logement décent ne peut pas dépasser un plafond de consommation d’énergie finale. Le calendrier s’applique ensuite par classe de DPE.',
    obligations: [
      'Depuis 2023, interdiction de louer un logement dépassant 450 kWh d’énergie finale par m² et par an (décence énergétique).',
      'Depuis le 1er janvier 2025, interdiction de louer les logements classés G.',
      'À partir de 2034, interdiction de louer les logements classés F.',
      'À partir de 2035, interdiction de louer les logements classés E.',
      'Le loyer d’une passoire thermique ne peut pas être augmenté ni réévalué à la relocation.',
    ],
    thresholds: [
      { label: 'Décence énergétique', value: 'plafond de 450 kWh/m²/an en énergie finale depuis 2023' },
      { label: '2025', value: 'classe G interdite à la location' },
      { label: '2034', value: 'classe F interdite à la location' },
      { label: '2035', value: 'classe E interdite à la location' },
    ],
    officialUrl: 'https://www.vie-publique.fr/loi/278860-loi-climat-et-resilience-22-aout-2021',
    relevance: ['certificate', 'renovation'],
  },
  {
    key: 'plan_canicule',
    title:
      'Plan national de gestion des vagues de chaleur',
    shortName: 'Plan canicule',
    summary:
      'Le plan national de gestion des vagues de chaleur organise la réponse des services de l’État et des collectivités pendant les épisodes de forte chaleur. Il repose sur les niveaux de vigilance Météo-France et fixe des recommandations pour les bâtiments, en particulier ceux qui accueillent des publics fragiles.',
    obligations: [
      'Quatre niveaux de vigilance : vert (veille saisonnière), jaune (pic de chaleur), orange (canicule), rouge (canicule extrême).',
      'En vigilance jaune et au-delà : fermer volets et fenêtres le jour, aérer la nuit, limiter les sources de chaleur internes.',
      'Les gestionnaires de bâtiments recevant du public doivent prévoir des pièces rafraîchies et une organisation adaptée.',
      'Recensement des personnes fragiles et activation des plans d’action en vigilance orange et rouge.',
    ],
    thresholds: [
      { label: 'Vigilance jaune', value: 'pic de chaleur bref, prudence pour les personnes sensibles' },
      { label: 'Vigilance orange', value: 'canicule avérée, vigilance renforcée pour tous' },
      { label: 'Vigilance rouge', value: 'canicule extrême, mobilisation générale' },
    ],
    officialUrl: 'https://sante.gouv.fr/sante-et-environnement/risques-climatiques/article/plan-national-de-gestion-des-vagues-de-chaleur',
    relevance: ['heatwave'],
  },
  {
    key: 'maprimenov',
    title:
      'MaPrimeRénov’ et primes des certificats d’économies d’énergie',
    shortName: 'MaPrimeRénov’',
    summary:
      'MaPrimeRénov’ finance la rénovation énergétique des logements selon deux parcours. Le parcours par geste subventionne un travail isolé (isolation, chauffage, ventilation). Le parcours accompagné finance une rénovation d’ampleur avec un gain d’au moins deux classes de DPE, sous la conduite d’un accompagnateur Rénov. Les primes des fournisseurs d’énergie, dites Coup de pouce, se cumulent selon les revenus.',
    obligations: [
      'Travaux réalisés par une entreprise certifiée RGE, condition d’éligibilité.',
      'Parcours accompagné : gain minimal de deux classes de DPE et accompagnement obligatoire.',
      'Sortie des chauffages fossiles encouragée : les chaudières gaz et fioul ne sont plus subventionnées au titre du parcours gestes.',
      'Demande de prime à déposer avant le début des travaux.',
    ],
    thresholds: [
      { label: 'Parcours accompagné', value: 'gain d’au moins deux classes de DPE' },
      { label: 'Taux de financement', value: 'de 30 à 90 % du montant des travaux selon les revenus du foyer' },
      { label: 'Coup de pouce CEE', value: 'prime forfaitaire selon le geste et le niveau de revenu' },
    ],
    officialUrl: 'https://france-renov.gouv.fr/aides/maprimenov',
    relevance: ['renovation', 'funding'],
  },
  {
    key: 'cee',
    title:
      'Certificats d’économies d’énergie et opérations Coup de pouce',
    shortName: 'CEE',
    summary:
      'Le dispositif des CEE impose aux fournisseurs d’énergie des obligations d’économies d’énergie. Ils s’acquittent en finançant des travaux chez leurs clients, via des primes versées sur des fiches d’opérations standardisées. Les coups de pouce bonifient les gestes les plus efficaces : remplacement de chauffage fossile et rénovation performante des maisons.',
    obligations: [
      'Prime versée par un fournisseur ou un acteur obligé, en complément de MaPrimeRénov’.',
      'Travaux conformes à une fiche d’opération standardisée (résistances thermiques minimales, efficacités minimales des équipements).',
      'Devis signé avant le début des travaux et entreprise RGE pour la plupart des fiches bâtiment.',
      'Cumul possible avec MaPrimeRénov’ dans la limite de plafonds selon les revenus.',
    ],
    thresholds: [
      { label: 'Isolation de murs', value: 'résistance minimale de 3,7 m².K/W en murs et 6 m².K/W en toiture selon les fiches' },
      { label: 'Coup de pouce chauffage', value: 'prime bonifiée pour le remplacement d’une chaudière fioul, gaz ou charbon' },
      { label: 'Coup de pouce rénovation performante', value: 'prime bonifiée pour une rénovation globale de maison individuelle' },
    ],
    officialUrl: 'https://www.ecologie.gouv.fr/dispositif-des-certificats-deconomies-denergie',
    relevance: ['renovation', 'funding'],
  },
];
