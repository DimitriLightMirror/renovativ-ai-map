import { useMemo, useState } from 'react';
import type { Building, OptimizationObjective, ScenarioResult } from '../../types';
import { rankGestures, suggestBestPackage } from '../../engine';
import { GESTURES_NL } from '../../content/gestures-nl';
import { REGULATION_NL } from '../../content/regulation-nl';
import RegulationCard from '../RegulationCard';
import {
  formatCurrency,
  formatDh,
  formatPayback,
  lotLabel,
} from '../../utils/format';

interface RenovationTabProps {
  building: Building;
}

const OBJECTIVES: { value: OptimizationObjective; label: string }[] = [
  { value: 'comfort', label: 'Summer comfort' },
  { value: 'energy', label: 'Energy' },
  { value: 'carbon', label: 'Carbon' },
  { value: 'cost', label: 'Cost' },
];

/** Measure ranking: the 10 best applicable gestures, SVG bars. */
function Chapelet({ results }: { results: ScenarioResult[] }) {
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
      aria-label="Renovation measure ranking"
    >
      {results.map((r, i) => {
        const y = i * rowHeight;
        const w = Math.max(3, (r.score / maxScore) * barWidth);
        const name =
          r.gesture.name.length > 24 ? `${r.gesture.name.slice(0, 23)}…` : r.gesture.name;
        return (
          <g key={r.gesture.id}>
            <title>{`${r.gesture.name}. ${r.gesture.description} Estimated cost: ${formatCurrency(
              r.estimatedCost,
            )}. Payback: ${formatPayback(r.paybackYears)}.`}</title>
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

/** Renovation tab: objective, measure ranking, recommended scenario, subsidies. */
export default function RenovationTab({ building }: RenovationTabProps) {
  const [objective, setObjective] = useState<OptimizationObjective>('energy');

  const ranked = useMemo(() => rankGestures(building, objective), [building, objective]);
  const top = ranked.filter((r) => r.applicable).slice(0, 10);
  const pack = useMemo(() => suggestBestPackage(building, objective), [building, objective]);

  const packGestures = pack.gestureIds
    .map((id) => GESTURES_NL.find((g) => g.id === id))
    .filter((g): g is NonNullable<typeof g> => g !== undefined);

  const items = REGULATION_NL.filter(
    (r) => r.relevance.includes('renovation') || r.relevance.includes('funding'),
  );

  return (
    <>
      <section className="detail-panel__section">
        <h3>Renovation objective</h3>
        <div className="objective-picker" role="group" aria-label="Renovation objective">
          {OBJECTIVES.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`btn btn-sm ${objective === o.value ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setObjective(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      <section className="detail-panel__section">
        <h3>Top renovation measures</h3>
        {top.length > 0 ? (
          <>
            <Chapelet results={top} />
            <p className="note">
              The 10 most relevant measures for this objective, scored out of
              100. Hover a bar for the measure detail and its payback period.
            </p>
          </>
        ) : (
          <p className="note">No applicable measure for this building and objective.</p>
        )}
      </section>

      <section className="detail-panel__section">
        <h3>Recommended scenario</h3>
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
                <dt>Total estimated cost</dt>
                <dd>{formatCurrency(pack.totalCost)}</dd>
              </div>
              <div className="kv-list__row">
                <dt>Annual saving</dt>
                <dd>{formatCurrency(pack.totalAnnualSaving)}</dd>
              </div>
              <div className="kv-list__row">
                <dt>Payback period</dt>
                <dd>{formatPayback(pack.paybackYears)}</dd>
              </div>
              <div className="kv-list__row">
                <dt>Energielabel</dt>
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
                <dt>Summer discomfort 2050</dt>
                <dd>
                  {formatDh(building.comfort.dh2050)} → {formatDh(pack.newDh2050)}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="note">No scenario available for this objective.</p>
        )}
        <p className="note">
          Pricing is indicative, based on RVO subsidy reference ranges
          (ISDE/SVV), not live market quotes.
        </p>
      </section>

      <section className="detail-panel__section">
        <h3>Regulation & subsidies</h3>
        {items.map((item) => (
          <RegulationCard key={item.key} item={item} />
        ))}
      </section>
    </>
  );
}
