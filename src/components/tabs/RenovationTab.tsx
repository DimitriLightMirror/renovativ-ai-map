import { useMemo, useState } from 'react';
import type { Building, OptimizationObjective, ScenarioResult } from '../../types';
import type { RegionConfig } from '../../regions';
import { stringsFor } from '../../regions/i18n';
import { rankGestures, suggestBestPackage, type EngineOptions } from '../../engine';
import RegulationCard from '../RegulationCard';
import {
  formatCurrency,
  formatDh,
  formatPayback,
  lotLabel,
} from '../../utils/format';

interface RenovationTabProps {
  building: Building;
  region: RegionConfig;
}

const OBJECTIVE_KEYS = ['comfort', 'energy', 'carbon', 'cost'] as const;

/** Graphique de chapelet : les 10 meilleurs gestes applicables, barres en SVG. */
function Chapelet({ results, ariaLabel }: { results: ScenarioResult[]; ariaLabel: string }) {
  const width = 340;
  const rowHeight = 30;
  const nameWidth = 128;
  const costWidth = 74;
  const barWidth = width - nameWidth - costWidth;
  const maxScore = Math.max(1, ...results.map((r) => r.score));

  return (
    <svg
      className="chapelet"
      viewBox={`0 0 ${width} ${results.length * rowHeight}`}
      role="img"
      aria-label={ariaLabel}
    >
      {results.map((r, i) => {
        const y = i * rowHeight;
        const w = Math.max(3, (r.score / maxScore) * barWidth);
        const name =
          r.gesture.name.length > 24 ? `${r.gesture.name.slice(0, 23)}…` : r.gesture.name;
        return (
          <g key={r.gesture.id}>
            <title>{`${r.gesture.name}. ${r.gesture.description} ${formatCurrency(
              r.estimatedCost,
            )}. ${formatPayback(r.paybackYears)}.`}</title>
            <text x={0} y={y + 18} fontSize="10.5" fill="#232323">
              {name}
            </text>
            <rect
              x={nameWidth}
              y={y + 6}
              width={w}
              height={rowHeight - 12}
              rx={3}
              fill="#D77259"
            />
            <text
              x={nameWidth + 4}
              y={y + 18}
              fontSize="9"
              fill="#ffffff"
              fontWeight={600}
            >
              {Math.round(r.score)}
            </text>
            <text
              x={width}
              y={y + 18}
              fontSize="10"
              textAnchor="end"
              fill="#5a5a5a"
            >
              {formatCurrency(r.estimatedCost)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Onglet Renovation : objectif, chapelet, scenario recommande, aides. */
export default function RenovationTab({ building, region }: RenovationTabProps) {
  const [objective, setObjective] = useState<OptimizationObjective>('energy');
  const t = stringsFor(region.language).renovation;

  const engineOptions: EngineOptions = useMemo(
    () => ({
      gestures: region.content.gestures,
      energyPrice: region.energyPrice,
      profile: region.engineProfile,
    }),
    [region],
  );

  const ranked = useMemo(
    () => rankGestures(building, objective, engineOptions),
    [building, objective, engineOptions],
  );
  const top = ranked.filter((r) => r.applicable).slice(0, 10);
  const pack = useMemo(
    () => suggestBestPackage(building, objective, undefined, engineOptions),
    [building, objective, engineOptions],
  );

  const packGestures = pack.gestureIds
    .map((id) => region.content.gestures.find((g) => g.id === id))
    .filter((g): g is NonNullable<typeof g> => g !== undefined);

  const items = region.content.regulation.filter(
    (r) => r.relevance.includes('renovation') || r.relevance.includes('funding'),
  );

  return (
    <>
      <section className="detail-panel__section">
        <h3>{t.objectiveTitle}</h3>
        <div className="objective-picker" role="group" aria-label={t.objectiveAriaLabel}>
          {OBJECTIVE_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={`btn btn-sm ${objective === key ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setObjective(key)}
            >
              {t.objectives[key]}
            </button>
          ))}
        </div>
      </section>

      <section className="detail-panel__section">
        <h3>{t.chapeletTitle}</h3>
        {top.length > 0 ? (
          <>
            <Chapelet results={top} ariaLabel={t.chapeletAriaLabel} />
            <p className="note">{t.chapeletNote}</p>
          </>
        ) : (
          <p className="note">{t.noGestures}</p>
        )}
      </section>

      <section className="detail-panel__section">
        <h3>{t.scenarioTitle}</h3>
        {packGestures.length > 0 ? (
          <div className="card scenario-card">
            <ul className="scenario-card__gestures">
              {packGestures.map((g) => (
                <li key={g.id}>
                  <strong>{g.name}</strong>
                  <span className="scenario-card__lot">{lotLabel(g.lot)}</span>
                </li>
              ))}
            </ul>
            <dl className="kv-list kv-list--compact">
              <div className="kv-list__row">
                <dt>{t.totalCost}</dt>
                <dd>{formatCurrency(pack.totalCost)}</dd>
              </div>
              <div className="kv-list__row">
                <dt>{t.annualSaving}</dt>
                <dd>{formatCurrency(pack.totalAnnualSaving)}</dd>
              </div>
              <div className="kv-list__row">
                <dt>{t.payback}</dt>
                <dd>{formatPayback(pack.paybackYears)}</dd>
              </div>
              <div className="kv-list__row">
                <dt>{t.certificateLabel}</dt>
                <dd className="label-shift">
                  <span className={`dpe-badge dpe-${building.certificate.label.toLowerCase()}`}>
                    {building.certificate.label}
                  </span>
                  <span aria-hidden="true">→</span>
                  <span className={`dpe-badge dpe-${pack.newLabel.toLowerCase()}`}>
                    {pack.newLabel}
                  </span>
                </dd>
              </div>
              <div className="kv-list__row">
                <dt>{t.summerDiscomfort}</dt>
                <dd>
                  {formatDh(building.comfort.dh2050)} → {formatDh(pack.newDh2050)}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="note">{t.noScenario}</p>
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
