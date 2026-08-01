import type { HeatwaveRecommendation } from '../types';

export const HEATWAVE_RECS_DK: HeatwaveRecommendation[] = [
  {
    id: 'dk-external-shading',
    title: 'Install external window shading',
    description:
      'Exterior blinds or screens stop solar heat before it reaches the glass and are the most effective passive measure.',
    trigger: 'envelope.solarProtection=false',
    priority: 'essentiel',
    regulationRefs: ['br18'],
    indicativeCostEUR: [8000, 30000],
  },
  {
    id: 'dk-night-ventilation',
    title: 'Use secure night ventilation',
    description:
      'Purge stored heat at night once outside air is cooler, then close windows and shading during the day.',
    trigger: 'systems.cooling=null',
    priority: 'essentiel',
    regulationRefs: ['br18'],
    indicativeCostEUR: [0, 12000],
  },
  {
    id: 'dk-roof-summer',
    title: 'Insulate and lighten the roof',
    description:
      'Roof insulation and a light roof finish protect top floors from both winter losses and summer solar gain.',
    trigger: 'envelope.uRoof>0.25',
    priority: 'recommande',
    regulationRefs: ['br18', 'energirenoveringspuljen'],
    indicativeCostEUR: [30000, 150000],
  },
  {
    id: 'dk-ceiling-fans',
    title: 'Fit efficient ceiling fans',
    description:
      'Ceiling fans improve perceived comfort with much less energy use than portable air conditioning.',
    trigger: 'systems.hasCeilingFans=false',
    priority: 'recommande',
    regulationRefs: ['klimaaftale'],
    indicativeCostEUR: [1500, 8000],
  },
];
