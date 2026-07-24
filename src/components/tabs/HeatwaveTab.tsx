import { useMemo } from 'react';
import type { Building, HeatwaveRecommendation } from '../../types';
import { comfortForHorizons } from '../../engine';
import { HEATWAVE_RECS_US } from '../../content/heatwave-us';
import { REGULATION_US } from '../../content/regulation-us';
import RegulationCard from '../RegulationCard';
import {
  coolingLabel,
  formatCostRange,
  formatDh,
  matchesTrigger,
} from '../../utils/format';

interface HeatwaveTabProps {
  building: Building;
}

const PRIORITY_ORDER: Record<HeatwaveRecommendation['priority'], number> = {
  essentiel: 0,
  recommande: 1,
  optionnel: 2,
};

const PRIORITY_LABELS: Record<HeatwaveRecommendation['priority'], string> = {
  essentiel: 'Essential',
  recommande: 'Recommended',
  optionnel: 'Optional',
};

/** Heat tab: summer comfort at three horizons and preparation measures. */
export default function HeatwaveTab({ building }: HeatwaveTabProps) {
  const horizons = comfortForHorizons(building);

  const recs = useMemo(
    () =>
      HEATWAVE_RECS_US.filter((r) => matchesTrigger(building, r.trigger)).sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
      ),
    [building],
  );

  const items = REGULATION_US.filter((r) => r.relevance.includes('heatwave'));

  const bubbles = [
    { year: '2025', dh: building.comfort.dh2025, c: horizons.h2025 },
    { year: '2050', dh: building.comfort.dh2050, c: horizons.h2050 },
    { year: '2100', dh: building.comfort.dh2100, c: horizons.h2100 },
  ];

  return (
    <>
      <section className="detail-panel__section">
        <h3>Summer comfort at three horizons</h3>
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
                {b.c.label}
              </span>
              <span className="comfort-cell__value">{formatDh(b.dh)}</span>
            </div>
          ))}
        </div>
        <p className="note">
          Degree-hours of indoor overheating per summer, without air
          conditioning. The 2050 and 2100 projections account for climate
          warming and the urban heat island effect.
        </p>
        {building.systems.cooling && (
          <p className="note note--cooling">
            This building already has mechanical cooling:{' '}
            {coolingLabel(building.systems.cooling)}. Passive measures remain
            the priority to limit energy use and outage risk.
          </p>
        )}
      </section>

      <section className="detail-panel__section">
        <h3>Heat wave preparation</h3>
        {recs.length > 0 ? (
          recs.map((rec) => (
            <article key={rec.id} className="card heatwave-card">
              <header className="heatwave-card__head">
                <h4>{rec.title}</h4>
                <span className={`priority-chip priority-chip--${rec.priority}`}>
                  {PRIORITY_LABELS[rec.priority]}
                </span>
              </header>
              <p>{rec.description}</p>
              <p className="heatwave-card__cost">
                Indicative cost: {formatCostRange(rec.indicativeCostEUR)}
              </p>
            </article>
          ))
        ) : (
          <p className="note">This building is already well prepared for heat events.</p>
        )}
      </section>

      <section className="detail-panel__section">
        <h3>Applicable guidance</h3>
        {items.map((item) => (
          <RegulationCard key={item.key} item={item} />
        ))}
      </section>
    </>
  );
}
