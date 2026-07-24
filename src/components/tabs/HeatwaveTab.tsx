import { useMemo } from 'react';
import type { Building, HeatwaveRecommendation } from '../../types';
import { comfortForHorizons } from '../../engine';
import { HEATWAVE_RECS_FR } from '../../content/heatwave-fr';
import { REGULATION_FR } from '../../content/regulation-fr';
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
  essentiel: 'Essentiel',
  recommande: 'Recommandé',
  optionnel: 'Optionnel',
};

/** Onglet Canicule : confort d'ete a trois horizons et preparation. */
export default function HeatwaveTab({ building }: HeatwaveTabProps) {
  const horizons = comfortForHorizons(building);

  const recs = useMemo(
    () =>
      HEATWAVE_RECS_FR.filter((r) => matchesTrigger(building, r.trigger)).sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
      ),
    [building],
  );

  const items = REGULATION_FR.filter((r) => r.relevance.includes('heatwave'));

  const bubbles = [
    { year: '2025', dh: building.comfort.dh2025, c: horizons.h2025 },
    { year: '2050', dh: building.comfort.dh2050, c: horizons.h2050 },
    { year: '2100', dh: building.comfort.dh2100, c: horizons.h2100 },
  ];

  return (
    <>
      <section className="detail-panel__section">
        <h3>Confort d’été à trois horizons</h3>
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
          Degrés-heures d’inconfort par été, sans climatisation. Les projections
          2050 et 2100 tiennent compte du réchauffement et de l’îlot de chaleur
          urbain.
        </p>
        {building.systems.cooling && (
          <p className="note note--cooling">
            Ce bâtiment dispose déjà d’un refroidissement :{' '}
            {coolingLabel(building.systems.cooling)}. Les mesures passives
            restent prioritaires pour limiter la consommation.
          </p>
        )}
      </section>

      <section className="detail-panel__section">
        <h3>Préparation aux canicules</h3>
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
                Coût indicatif : {formatCostRange(rec.indicativeCostEUR)}
              </p>
            </article>
          ))
        ) : (
          <p className="note">Ce bâtiment est déjà bien préparé aux épisodes chauds.</p>
        )}
      </section>

      <section className="detail-panel__section">
        <h3>Réglementation applicable</h3>
        {items.map((item) => (
          <RegulationCard key={item.key} item={item} />
        ))}
      </section>
    </>
  );
}
