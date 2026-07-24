import { useMemo, useState } from 'react';
import type { Building, OptimizationObjective, ScenarioResult } from '../../types';
import { rankGestures, suggestBestPackage } from '../../engine';
import { GESTURES_FR } from '../../content/gestures-fr';
import { REGULATION_FR } from '../../content/regulation-fr';
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
  { value: 'comfort', label: 'Confort d’été' },
  { value: 'energy', label: 'Énergie' },
  { value: 'carbon', label: 'Carbone' },
  { value: 'cost', label: 'Coût' },
];

/** Graphique de chapelet : les 10 meilleurs gestes applicables, barres en SVG. */
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
      aria-label="Classement des gestes de rénovation"
    >
      {results.map((r, i) => {
        const y = i * rowHeight;
        const w = Math.max(3, (r.score / maxScore) * barWidth);
        const name =
          r.gesture.name.length > 24 ? `${r.gesture.name.slice(0, 23)}…` : r.gesture.name;
        return (
          <g key={r.gesture.id}>
            <title>{`${r.gesture.name}. ${r.gesture.description} Coût estimé : ${formatCurrency(
              r.estimatedCost,
            )}. Retour : ${formatPayback(r.paybackYears)}.`}</title>
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
export default function RenovationTab({ building }: RenovationTabProps) {
  const [objective, setObjective] = useState<OptimizationObjective>('energy');

  const ranked = useMemo(() => rankGestures(building, objective), [building, objective]);
  const top = ranked.filter((r) => r.applicable).slice(0, 10);
  const pack = useMemo(() => suggestBestPackage(building, objective), [building, objective]);

  const packGestures = pack.gestureIds
    .map((id) => GESTURES_FR.find((g) => g.id === id))
    .filter((g): g is NonNullable<typeof g> => g !== undefined);

  const items = REGULATION_FR.filter(
    (r) => r.relevance.includes('renovation') || r.relevance.includes('funding'),
  );

  return (
    <>
      <section className="detail-panel__section">
        <h3>Objectif de rénovation</h3>
        <div className="objective-picker" role="group" aria-label="Objectif de rénovation">
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
        <h3>Graphique de chapelet</h3>
        {top.length > 0 ? (
          <>
            <Chapelet results={top} />
            <p className="note">
              Les 10 gestes les plus pertinents pour cet objectif, notés sur 100.
              Survolez une barre pour le détail du geste et son retour sur
              investissement.
            </p>
          </>
        ) : (
          <p className="note">Aucun geste applicable à ce bâtiment pour cet objectif.</p>
        )}
      </section>

      <section className="detail-panel__section">
        <h3>Scénario recommandé</h3>
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
                <dt>Coût total estimé</dt>
                <dd>{formatCurrency(pack.totalCost)}</dd>
              </div>
              <div className="kv-list__row">
                <dt>Économie annuelle</dt>
                <dd>{formatCurrency(pack.totalAnnualSaving)}</dd>
              </div>
              <div className="kv-list__row">
                <dt>Retour sur investissement</dt>
                <dd>{formatPayback(pack.paybackYears)}</dd>
              </div>
              <div className="kv-list__row">
                <dt>Étiquette DPE</dt>
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
                <dt>Inconfort d’été 2050</dt>
                <dd>
                  {formatDh(building.comfort.dh2050)} → {formatDh(pack.newDh2050)}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="note">Aucun scénario disponible pour cet objectif.</p>
        )}
      </section>

      <section className="detail-panel__section">
        <h3>Réglementation et aides</h3>
        {items.map((item) => (
          <RegulationCard key={item.key} item={item} />
        ))}
      </section>
    </>
  );
}
