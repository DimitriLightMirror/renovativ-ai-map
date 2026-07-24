/**
 * Heat wave preparation recommendations, United States pathway (usa branch).
 * The `trigger` field uses the shared DSL over Building paths;
 * an empty string means the recommendation is always relevant.
 * indicativeCostEUR: indicative range for a typical home or office floor,
 * US dollars 2025 (field name kept from the shared data contract).
 */

import type { HeatwaveRecommendation } from '../types';

export const HEATWAVE_RECS_US: HeatwaveRecommendation[] = [
  {
    id: 'shade_screens',
    title: 'Fit exterior shade screens on sun-exposed windows',
    description:
      'Solar screens on south, east and west windows block the heat before it reaches the glass. Closed before the sun hits, they stop most solar gains. This is the single most effective measure against indoor overheating and standard practice across the Southwest.',
    trigger: 'envelope.solarProtection=false',
    priority: 'essentiel',
    regulationRefs: ['fema_noaa_extreme_heat'],
    indicativeCostEUR: [400, 2500],
  },
  {
    id: 'ceiling_fans',
    title: 'Install ceiling fans in lived-in rooms',
    description:
      'A ceiling fan improves perceived comfort by 4 to 5 degrees F for a few watts of electricity. It is an efficient backup when indoor temperatures climb past 80 degrees F, and it can delay turning on the air conditioner by hours each day.',
    trigger: 'systems.hasCeilingFans=false',
    priority: 'essentiel',
    regulationRefs: ['fema_noaa_extreme_heat', 'energy_star'],
    indicativeCostEUR: [150, 800],
  },
  {
    id: 'night_ventilation',
    title: 'Set up night flushing with windows or a whole-house fan',
    description:
      'Open windows wide after sunset when outdoor air drops below indoor temperature, then close everything by mid-morning. In multifamily and commercial buildings, plan secure openings or motorized night ventilation on a temperature sensor. A whole-house fan automates the flush in single-family homes.',
    trigger: 'systems.cooling=null',
    priority: 'essentiel',
    regulationRefs: ['fema_noaa_extreme_heat'],
    indicativeCostEUR: [0, 1900],
  },
  {
    id: 'attic_insulation_heat',
    title: 'Upgrade attic insulation',
    description:
      'The roof takes the most intense sun of the day, and attics can exceed 140 degrees F in a heat wave. Bringing attic insulation to R-49 or R-60 sharply cuts heat flow into the top floor while also improving winter performance.',
    trigger: 'constructionYear<1980',
    priority: 'recommande',
    regulationRefs: ['iecc_2021', 'ira_25c'],
    indicativeCostEUR: [1500, 5000],
  },
  {
    id: 'cool_roof_heat',
    title: 'Apply a cool roof treatment',
    description:
      'A reflective coating on a flat roof, or cool-rated shingles on a sloped one, sends solar radiation back instead of absorbing it. Roof surface temperature can drop 50 to 90 degrees F in full sun, directly relieving the rooms below and trimming air conditioning demand.',
    trigger: 'comfort.dh2025>1500',
    priority: 'recommande',
    regulationRefs: ['fema_noaa_extreme_heat', 'ashrae_90_1'],
    indicativeCostEUR: [1000, 6000],
  },
  {
    id: 'window_film_heat',
    title: 'Apply solar control film to exposed glass',
    description:
      'Reflective films on south and west glazing are a fast, affordable fallback when exterior shading is not possible, for example in condos with facade rules. Less effective than an exterior screen but installed in a day.',
    trigger: 'envelope.solarProtection=false',
    priority: 'recommande',
    regulationRefs: ['fema_noaa_extreme_heat'],
    indicativeCostEUR: [200, 1500],
  },
  {
    id: 'service_ac',
    title: 'Service air conditioning before heat season',
    description:
      'Clean or replace filters, clear the condenser, check refrigerant charge and seal duct leaks. A neglected system can lose a quarter of its capacity, which shows up exactly on the hottest days. Schedule maintenance in spring, before the first NWS heat advisories.',
    trigger: 'systems.cooling!=null',
    priority: 'essentiel',
    regulationRefs: ['fema_noaa_extreme_heat', 'energy_star'],
    indicativeCostEUR: [100, 500],
  },
  {
    id: 'cool_room',
    title: 'Plan a cool room and know the nearest cooling center',
    description:
      'Identify the room that stays coolest (north-facing, shaded, lowest floor) and equip it with a fan or a portable unit. For households without air conditioning, FEMA and local emergency agencies publish cooling center locations during excessive heat warnings: libraries, community centers and malls also serve as daytime refuges.',
    trigger: 'systems.cooling=null',
    priority: 'essentiel',
    regulationRefs: ['fema_noaa_extreme_heat'],
    indicativeCostEUR: [0, 300],
  },
  {
    id: 'reduce_internal_gains',
    title: 'Cut internal heat gains during heat alerts',
    description:
      'Shift oven, dishwasher and laundry use to early morning or late evening, switch off standby electronics and use LED lighting. Free measures to apply as soon as the National Weather Service issues a heat advisory.',
    trigger: '',
    priority: 'essentiel',
    regulationRefs: ['fema_noaa_extreme_heat'],
    indicativeCostEUR: [0, 100],
  },
  {
    id: 'erv_heat',
    title: 'Add balanced ventilation with heat recovery',
    description:
      'An ERV keeps fresh air flowing with windows closed while transferring heat and moisture to the outgoing stream, and it can bypass the core for free night cooling. Valuable in noisy or wildfire-smoke-prone areas where opening windows is difficult.',
    trigger: 'systems.ventilation!=vmc_double_flux',
    priority: 'recommande',
    regulationRefs: ['iecc_2021', 'energy_star'],
    indicativeCostEUR: [2500, 4500],
  },
  {
    id: 'shade_trees',
    title: 'Plant deciduous shade trees on the south and west sides',
    description:
      'Trees shade walls and glass in summer and let the low winter sun through after leaf drop. A long-term measure that also cools the yard by evapotranspiration; combine with shade screens while the trees grow.',
    trigger: 'usage=residential_individual',
    priority: 'optionnel',
    regulationRefs: ['fema_noaa_extreme_heat'],
    indicativeCostEUR: [200, 2000],
  },
  {
    id: 'thermal_curtains',
    title: 'Hang light-colored thermal curtains as a stopgap',
    description:
      'Closed during the day on the sunny side, thermal curtains delay heat entry into the room, though the glass still warms behind them. A temporary fix while exterior shading is being planned.',
    trigger: 'envelope.solarProtection=false',
    priority: 'optionnel',
    regulationRefs: ['fema_noaa_extreme_heat'],
    indicativeCostEUR: [50, 400],
  },
];
