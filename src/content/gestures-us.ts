/**
 * Renovation gesture base, United States pathway (usa branch).
 * Mode 'simple': macro gestures for the general public.
 * Mode 'detail': variants shown at audit level.
 * Indicative costs 2025, installed, US dollars.
 * applicableWhen uses the shared DSL over Building paths.
 */

import type { RenovationGesture } from '../types';

export const GESTURES_US: RenovationGesture[] = [
  // ------------------------------------------------------------------ walls
  {
    id: 'cavity_fill',
    name: 'Wall cavity fill insulation',
    lot: 'murs',
    mode: 'simple',
    description:
      'Dense-pack cellulose or fiberglass blown into empty wall cavities through small drilled holes, then patched. The standard retrofit for older wood-frame homes with uninsulated walls. Cost per square meter of wall.',
    costPerM2: 18,
    epSavingPct: 0.14,
    gesSavingPct: 0.14,
    dhReductionPct: 0.02,
    applicableWhen: 'envelope.wallInsulation=aucune',
    requiresGestureIds: [],
    regulationRefs: ['ira_25c', 'iecc_2021', 'hers_index'],
  },
  {
    id: 'exterior_continuous_insulation',
    name: 'Exterior continuous insulation with new siding',
    lot: 'murs',
    mode: 'simple',
    description:
      'One to two inches of rigid foam or mineral wool over the sheathing, under new siding. Cuts thermal bridging through the studs and refreshes the facade in the same project. Cost per square meter of wall.',
    costPerM2: 105,
    epSavingPct: 0.18,
    gesSavingPct: 0.18,
    dhReductionPct: 0.05,
    applicableWhen: 'envelope.wallInsulation!=ite',
    requiresGestureIds: [],
    regulationRefs: ['ira_25c', 'iecc_2021', 'hers_index'],
  },
  {
    id: 'insulated_siding',
    name: 'Foam-backed insulated siding',
    lot: 'murs',
    mode: 'detail',
    description:
      'Vinyl or fiber-cement siding laminated to contoured foam, adding about R-4 over the studs during a residing project. A lighter complement to cavity insulation. Cost per square meter of wall.',
    costPerM2: 55,
    epSavingPct: 0.05,
    gesSavingPct: 0.05,
    dhReductionPct: 0.02,
    applicableWhen: 'envelope.wallInsulation=iti',
    requiresGestureIds: [],
    regulationRefs: ['ira_25c', 'energy_star'],
  },

  // ------------------------------------------------------------------ attic
  {
    id: 'attic_insulation',
    name: 'Attic insulation upgrade to R-49 or R-60',
    lot: 'toiture',
    mode: 'simple',
    description:
      'Blown cellulose or fiberglass over the attic floor to reach the IECC target for the climate zone. The cheapest and most cost-effective measure on most single-family homes. Cost per square meter of attic floor.',
    costPerM2: 22,
    epSavingPct: 0.12,
    gesSavingPct: 0.12,
    dhReductionPct: 0.08,
    applicableWhen: 'envelope.roofType=inclinee',
    requiresGestureIds: [],
    regulationRefs: ['ira_25c', 'iecc_2021', 'hers_index'],
  },
  {
    id: 'roof_deck_insulation',
    name: 'Spray foam at the roof deck',
    lot: 'toiture',
    mode: 'detail',
    description:
      'Open or closed cell spray foam applied under the roof deck to bring the attic inside the thermal envelope. The right choice when ducts or air handlers sit in the attic. Cost per square meter of roof slope.',
    costPerM2: 45,
    epSavingPct: 0.1,
    gesSavingPct: 0.1,
    dhReductionPct: 0.1,
    applicableWhen: 'envelope.roofType=inclinee',
    requiresGestureIds: [],
    regulationRefs: ['ira_25c', 'iecc_2021'],
  },
  {
    id: 'flat_roof_insulation',
    name: 'Polyiso insulation above the flat roof deck',
    lot: 'toiture',
    mode: 'simple',
    description:
      'Polyisocyanurate boards added above the deck during reroofing, under the new membrane. No disruption for occupants and a strong cut in top-floor overheating. Cost per square meter of roof.',
    costPerM2: 70,
    epSavingPct: 0.13,
    gesSavingPct: 0.13,
    dhReductionPct: 0.08,
    applicableWhen: 'envelope.roofType=terrasse',
    requiresGestureIds: [],
    regulationRefs: ['ira_25c', 'ashrae_90_1'],
  },
  {
    id: 'cool_roof_coating',
    name: 'Cool roof coating',
    lot: 'toiture',
    mode: 'simple',
    description:
      'White elastomeric coating that reflects solar radiation instead of absorbing it. Roof surface temperature can drop 50 to 90 degrees F in full sun, directly relieving the top floor. Cost per square meter of roof.',
    costPerM2: 35,
    epSavingPct: 0.03,
    gesSavingPct: 0.03,
    dhReductionPct: 0.22,
    applicableWhen: 'envelope.roofType=terrasse',
    requiresGestureIds: [],
    regulationRefs: ['fema_noaa_extreme_heat', 'ashrae_90_1'],
  },
  {
    id: 'cool_roof_shingles',
    name: 'Cool-rated shingles and radiant barrier',
    lot: 'toiture',
    mode: 'detail',
    description:
      'Solar-reflective asphalt shingles combined with a radiant barrier under the roof deck. Lowers attic temperatures by up to 30 degrees F in hot climates. Cost per square meter of roof.',
    costPerM2: 45,
    epSavingPct: 0.03,
    gesSavingPct: 0.03,
    dhReductionPct: 0.15,
    applicableWhen: 'envelope.roofType=inclinee',
    requiresGestureIds: [],
    regulationRefs: ['fema_noaa_extreme_heat', 'ira_25c'],
  },

  // ------------------------------------------------------------------ floor
  {
    id: 'crawlspace_insulation',
    name: 'Crawl space and basement ceiling insulation',
    lot: 'plancher',
    mode: 'simple',
    description:
      'Batts or spray foam on the floor deck above a vented crawl space or unconditioned basement, with air sealing of penetrations. Removes cold floors in winter. Cost per square meter of floor.',
    costPerM2: 30,
    epSavingPct: 0.07,
    gesSavingPct: 0.07,
    dhReductionPct: 0.02,
    applicableWhen: '',
    requiresGestureIds: [],
    regulationRefs: ['ira_25c', 'iecc_2021'],
  },

  // ---------------------------------------------------------------- windows
  {
    id: 'low_e_windows',
    name: 'Low-e double pane window replacement',
    lot: 'baies',
    mode: 'simple',
    description:
      'ENERGY STAR rated vinyl or fiberglass windows with low-e coating, argon fill and warm-edge spacers, selected for the climate zone. Ends cold glass discomfort and cuts outside noise. Cost per square meter of window.',
    costPerM2: 650,
    epSavingPct: 0.1,
    gesSavingPct: 0.1,
    dhReductionPct: 0.06,
    applicableWhen: 'envelope.glazingType=simple',
    requiresGestureIds: [],
    regulationRefs: ['ira_25c', 'energy_star', 'hers_index'],
  },
  {
    id: 'window_upgrade_argon',
    name: 'Upgrade aging double pane windows',
    lot: 'baies',
    mode: 'detail',
    description:
      'Replacement of first-generation double pane units with modern low-e argon glazing, with air sealing of the frame perimeter. Worthwhile when seals have failed or frames conduct heat. Cost per square meter of window.',
    costPerM2: 550,
    epSavingPct: 0.05,
    gesSavingPct: 0.05,
    dhReductionPct: 0.03,
    applicableWhen: 'envelope.glazingType=double',
    requiresGestureIds: [],
    regulationRefs: ['energy_star', 'hers_index'],
  },
  {
    id: 'storm_windows',
    name: 'Low-e storm windows',
    lot: 'baies',
    mode: 'detail',
    description:
      'Interior or exterior storm panels with low-e glass fitted over existing single pane windows. A fraction of the cost of full replacement, well suited to historic homes. Cost per square meter of window.',
    costPerM2: 180,
    epSavingPct: 0.04,
    gesSavingPct: 0.04,
    dhReductionPct: 0.03,
    applicableWhen: 'envelope.glazingType=simple',
    requiresGestureIds: [],
    regulationRefs: ['ira_25c', 'energy_star'],
  },

  // -------------------------------------------------------- solar protection
  {
    id: 'shade_screens',
    name: 'Exterior solar shade screens',
    lot: 'protections_solaires',
    mode: 'simple',
    description:
      'Tight-weave screens mounted outside sun-exposed windows. They block up to 90 percent of solar heat before it reaches the glass, the most effective single measure against overheating. Common practice in the Southwest. Cost per square meter of window.',
    costPerM2: 90,
    epSavingPct: 0.03,
    gesSavingPct: 0.03,
    dhReductionPct: 0.25,
    applicableWhen: 'envelope.solarProtection=false',
    requiresGestureIds: [],
    regulationRefs: ['fema_noaa_extreme_heat'],
  },
  {
    id: 'window_film',
    name: 'Solar control window film',
    lot: 'protections_solaires',
    mode: 'simple',
    description:
      'Reflective film applied to south and west glazing. Fast and affordable, less effective than exterior shading and typically renewed every ten to fifteen years. Cost per square meter of treated glass.',
    costPerM2: 75,
    epSavingPct: 0.02,
    gesSavingPct: 0.02,
    dhReductionPct: 0.15,
    applicableWhen: 'envelope.solarProtection=false',
    requiresGestureIds: [],
    regulationRefs: ['fema_noaa_extreme_heat'],
  },
  {
    id: 'awnings',
    name: 'Operable awnings on south and west windows',
    lot: 'protections_solaires',
    mode: 'detail',
    description:
      'Fabric awnings extended in summer to shade the glass and retracted in winter to admit low sun. A maintenance-light option for single-family homes. Cost per square meter of shaded window.',
    costPerM2: 140,
    epSavingPct: 0.02,
    gesSavingPct: 0.02,
    dhReductionPct: 0.22,
    applicableWhen: 'envelope.solarProtection=false;usage=residential_individual',
    requiresGestureIds: [],
    regulationRefs: ['fema_noaa_extreme_heat'],
  },

  // ---------------------------------------------------------------- heating
  {
    id: 'air_source_heat_pump',
    name: 'Air source heat pump',
    lot: 'chauffage',
    mode: 'simple',
    description:
      'Cold-climate rated ducted heat pump replacing the furnace and air conditioner. Cuts heating energy by half or more, ends on-site fossil fuel combustion and provides efficient cooling. Fixed part plus capacity pricing per kW installed.',
    // Capacity pricing: the engine computes fixedCost + kW x price per kW,
    // with capacity sized on the building (see scenarios.ts).
    fixedCost: 12000,
    epSavingPct: 0.45,
    gesSavingPct: 0.65,
    dhReductionPct: 0.1,
    applicableWhen: 'systems.heating.energy!=pac',
    requiresGestureIds: ['duct_sealing'],
    regulationRefs: ['ira_25c', 'ira_25d_homes_heehra', 'energy_star', 'hers_index'],
  },
  {
    id: 'mini_split',
    name: 'Ductless mini-split heat pump',
    lot: 'chauffage',
    mode: 'detail',
    description:
      'Wall-mounted indoor units that heat in winter and cool in summer, no ducts required. The right fit for homes with baseboard heat or window units. Fixed part plus capacity pricing per kW installed.',
    // Capacity pricing: the engine computes fixedCost + kW x price per kW,
    // with capacity sized on the building (see scenarios.ts).
    fixedCost: 6500,
    epSavingPct: 0.35,
    gesSavingPct: 0.55,
    dhReductionPct: 0.3,
    applicableWhen: 'systems.heating.energy!=pac;systems.cooling=null',
    requiresGestureIds: [],
    regulationRefs: ['ira_25c', 'ira_25d_homes_heehra', 'energy_star'],
  },
  {
    id: 'geothermal_heat_pump',
    name: 'Geothermal heat pump',
    lot: 'chauffage',
    mode: 'detail',
    description:
      'Ground-source heat pump with a vertical or horizontal loop field. The highest-efficiency heating and cooling option, with a 30 percent federal tax credit under section 25D. Fixed part plus capacity pricing per kW installed.',
    // Capacity pricing: the engine computes fixedCost + kW x price per kW,
    // with capacity sized on the building (see scenarios.ts).
    fixedCost: 30000,
    epSavingPct: 0.5,
    gesSavingPct: 0.7,
    dhReductionPct: 0.1,
    applicableWhen: 'systems.heating.energy!=pac;usage=residential_individual',
    requiresGestureIds: [],
    regulationRefs: ['ira_25d_homes_heehra', 'energy_star'],
  },
  {
    id: 'high_eff_furnace',
    name: 'High-efficiency condensing gas furnace',
    lot: 'chauffage',
    mode: 'detail',
    description:
      'Replacement of an aging furnace with a 96 percent AFUE condensing model. A real but limited gain: the home stays on fossil gas and no federal credit applies. Installed cost.',
    fixedCost: 5500,
    epSavingPct: 0.1,
    gesSavingPct: 0.1,
    dhReductionPct: 0,
    applicableWhen: 'systems.heating.energy=gaz_naturel',
    requiresGestureIds: [],
    regulationRefs: ['hers_index'],
  },
  {
    id: 'duct_sealing',
    name: 'Duct sealing and insulation',
    lot: 'chauffage',
    mode: 'simple',
    description:
      'Mastic or aerosol sealing of duct joints plus insulation of runs in attics and crawl spaces. Leaky ducts waste 20 to 30 percent of conditioned air. A prerequisite before any heat pump conversion. Fixed cost.',
    fixedCost: 1400,
    epSavingPct: 0.08,
    gesSavingPct: 0.08,
    dhReductionPct: 0.02,
    applicableWhen: '',
    requiresGestureIds: [],
    regulationRefs: ['ira_25c', 'iecc_2021'],
  },

  // ------------------------------------------------------------------- dhw
  {
    id: 'heat_pump_water_heater',
    name: 'Heat pump water heater',
    lot: 'ecs',
    mode: 'simple',
    description:
      'Hybrid water heater that draws heat from the surrounding air, using two to three times less electricity than a standard resistance tank. Qualifies for the 2 000 dollar 25C credit and HEEHRA rebates. Installed cost.',
    fixedCost: 3000,
    epSavingPct: 0.07,
    gesSavingPct: 0.08,
    dhReductionPct: 0,
    applicableWhen: '',
    requiresGestureIds: [],
    regulationRefs: ['ira_25c', 'ira_25d_homes_heehra', 'energy_star'],
  },
  {
    id: 'solar_water_heater',
    name: 'Solar water heating system',
    lot: 'ecs',
    mode: 'detail',
    description:
      'Roof collectors and a twin-coil tank covering 50 to 70 percent of annual hot water needs, with the existing heater as backup. Eligible for the 30 percent 25D credit. Installed cost.',
    fixedCost: 7000,
    epSavingPct: 0.05,
    gesSavingPct: 0.06,
    dhReductionPct: 0,
    applicableWhen: '',
    requiresGestureIds: [],
    regulationRefs: ['ira_25d_homes_heehra'],
  },

  // ---------------------------------------------------------------- cooling
  {
    id: 'ceiling_fans',
    name: 'Ceiling fans',
    lot: 'refroidissement',
    mode: 'simple',
    description:
      'ENERGY STAR rated ceiling fans in living rooms and bedrooms. Moving air improves perceived comfort by 4 to 5 degrees F for a few watts, delaying or reducing air conditioning use. Installed cost for a typical home.',
    fixedCost: 275,
    epSavingPct: 0.01,
    gesSavingPct: 0.01,
    dhReductionPct: 0.18,
    applicableWhen: 'systems.hasCeilingFans=false',
    requiresGestureIds: [],
    regulationRefs: ['fema_noaa_extreme_heat', 'energy_star'],
  },
  {
    id: 'whole_house_fan',
    name: 'Whole-house fan for night flushing',
    lot: 'refroidissement',
    mode: 'detail',
    description:
      'High-capacity fan that exhausts hot indoor air through the attic after sunset, flushing stored heat when outdoor air is cooler. Most effective in dry climates with cool nights. Installed cost.',
    fixedCost: 1900,
    epSavingPct: 0.02,
    gesSavingPct: 0.02,
    dhReductionPct: 0.22,
    applicableWhen: 'systems.cooling=null',
    requiresGestureIds: [],
    regulationRefs: ['fema_noaa_extreme_heat'],
  },

  // ------------------------------------------------------------- ventilation
  {
    id: 'erv_hrv',
    name: 'Balanced ventilation with heat recovery (ERV/HRV)',
    lot: 'ventilation',
    mode: 'simple',
    description:
      'Balanced supply and exhaust with a recovery core that transfers heat and, for an ERV, moisture between the streams. Essential for tight, well-sealed homes and a big cut in ventilation losses. Installed cost.',
    fixedCost: 3200,
    epSavingPct: 0.06,
    gesSavingPct: 0.06,
    dhReductionPct: 0.05,
    applicableWhen: 'systems.ventilation!=vmc_double_flux',
    requiresGestureIds: [],
    regulationRefs: ['iecc_2021', 'energy_star'],
  },

  // ------------------------------------------------------------------ solar
  {
    id: 'rooftop_pv',
    name: 'Rooftop solar PV',
    lot: 'solaire',
    mode: 'simple',
    description:
      'Grid-tied photovoltaic array sized to daytime loads. Lowers purchased electricity and improves the home energy rating; the 30 percent 25D credit applies with no annual cap. Cost per square meter of panel.',
    costPerM2: 320,
    epSavingPct: 0.06,
    gesSavingPct: 0.08,
    dhReductionPct: 0,
    applicableWhen: 'systems.pvSurfaceM2<10',
    requiresGestureIds: [],
    regulationRefs: ['ira_25d_homes_heehra', 'hers_index'],
  },
  {
    id: 'pv_extension',
    name: 'Rooftop PV extension',
    lot: 'solaire',
    mode: 'detail',
    description:
      'Additional panels on the free roof faces, with inverter resizing. Builds on an existing array. Cost per square meter of panel.',
    costPerM2: 280,
    epSavingPct: 0.03,
    gesSavingPct: 0.04,
    dhReductionPct: 0,
    applicableWhen: 'systems.pvSurfaceM2>10',
    requiresGestureIds: [],
    regulationRefs: ['ira_25d_homes_heehra'],
  },

  // ------------------------------------------------------------------ usage
  {
    id: 'smart_thermostat',
    name: 'Smart thermostat',
    lot: 'usage',
    mode: 'simple',
    description:
      'Learning thermostat with schedules and geofencing: setpoints relaxed at night and when the home is empty, remote control during heat alerts. ENERGY STAR certified models qualify for the 25C credit. Installed cost.',
    fixedCost: 220,
    epSavingPct: 0.07,
    gesSavingPct: 0.07,
    dhReductionPct: 0.02,
    applicableWhen: '',
    requiresGestureIds: [],
    regulationRefs: ['ira_25c', 'energy_star'],
  },
  {
    id: 'air_sealing',
    name: 'Blower-door guided air sealing',
    lot: 'usage',
    mode: 'simple',
    description:
      'Pressurization test to locate leaks, then sealing of attic penetrations, rim joists, window frames and outlets. Typical older homes lose a third of their heating energy to leakage. Installed cost.',
    fixedCost: 1500,
    epSavingPct: 0.08,
    gesSavingPct: 0.08,
    dhReductionPct: 0.04,
    applicableWhen: '',
    requiresGestureIds: [],
    regulationRefs: ['ira_25c', 'iecc_2021'],
  },
];
