import { useMemo } from 'react';
import type { Building, HeatwaveRecommendation } from '../../types';
import type { RegionConfig } from '../../regions';
import { stringsFor } from '../../regions/i18n';
import { comfortForHorizons } from '../../engine';
import RegulationCard from '../RegulationCard';
import {
  coolingLabel,
  formatCostRange,
  formatDh,
  matchesTrigger,
} from '../../utils/format';

interface HeatwaveTabProps {
  building: Building;
  region: RegionConfig;
}

const PRIORITY_ORDER: Record<HeatwaveRecommendation['priority'], number> = {
  essentiel: 0,
  recommande: 1,
  optionnel: 2,
};

/** Onglet Canicule : confort d'ete a trois horizons et preparation. */
export default function HeatwaveTab({ building, region }: HeatwaveTabProps) {
  const horizons = comfortForHorizons(building);
  const t = stringsFor(region.language).heatwave;

  const recs = useMemo(
    () =>
      region.content.heatwave
        .filter((r) => matchesTrigger(building, r.trigger))
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
    [building, region],
  );

  const items = region.content.regulation.filter((r) => r.relevance.includes('heatwave'));

  const comfortLabels: Record<string, string> = {
    confortable: stringsFor(region.language).map.comfortLegend[0].label,
    inconfort_modere: stringsFor(region.language).map.comfortLegend[1].label,
    inconfort_fort: stringsFor(region.language).map.comfortLegend[2].label,
    inconfort_severe: stringsFor(region.language).map.comfortLegend[3].label,
  };

  const bubbles = [
    { year: '2025', dh: building.comfort.dh2025, c: horizons.h2025 },
    { year: '2050', dh: building.comfort.dh2050, c: horizons.h2050 },
    { year: '2100', dh: building.comfort.dh2100, c: horizons.h2100 },
  ];

  return (
    <>
      <section className="detail-panel__section">
        <h3>{t.comfortTitle}</h3>
        <div className="comfort-row">
          {bubbles.map((b) => (
            <div key={b.year} className="comfort-cell">
              <span className="comfort-cell__year">{b.year}</span>
              <span
                className="comfort-cell__bubble"
                style={{
                  backgroundColor: b.c.color,
                  color: b.c.level === 'inconfort_modere' ? '#232323' : '#ffffff',
                }}
              >
                {comfortLabels[b.c.level]}
              </span>
              <span className="comfort-cell__value">{formatDh(b.dh)}</span>
            </div>
          ))}
        </div>
        <p className="note">{t.comfortNote}</p>
        {building.systems.cooling && (
          <p className="note note--cooling">
            {t.coolingNotePrefix}
            {coolingLabel(building.systems.cooling)}
            {t.coolingNoteSuffix}
          </p>
        )}
      </section>

      <section className="detail-panel__section">
        <h3>{t.prepTitle}</h3>
        {recs.length > 0 ? (
          recs.map((rec) => (
            <article key={rec.id} className="card heatwave-card">
              <header className="heatwave-card__head">
                <h4>{rec.title}</h4>
                <span className={`priority-chip priority-chip--${rec.priority}`}>
                  {t.priorities[rec.priority]}
                </span>
              </header>
              <p>{rec.description}</p>
              <p className="heatwave-card__cost">
                {t.indicativeCost}
                {formatCostRange(rec.indicativeCostEUR)}
              </p>
            </article>
          ))
        ) : (
          <p className="note">{t.wellPrepared}</p>
        )}
      </section>

      <section className="detail-panel__section">
        <h3>{t.regulationTitle}</h3>
        {items.map((item) => (
          <RegulationCard key={item.key} item={item} lang={region.language} />
        ))}
      </section>
    </>
  );
}
