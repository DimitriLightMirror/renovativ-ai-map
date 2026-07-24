import type { Building, EnergyLabel } from '../../types';
import type { RegionConfig } from '../../regions';
import { stringsFor } from '../../regions/i18n';
import { gaugeBounds } from '../../engine';
import RegulationCard from '../RegulationCard';
import {
  formatAnnualGes,
  formatAnnualKwh,
  formatCurrency,
  formatEp,
  formatGes,
} from '../../utils/format';

interface DpeTabProps {
  building: Building;
  region: RegionConfig;
}

const LABELS: EnergyLabel[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const LABEL_COLORS: Record<EnergyLabel, string> = {
  A: '#319834',
  B: '#33CC31',
  C: '#CBFC34',
  D: '#FBFE06',
  E: '#FBCC0C',
  F: '#FC9935',
  G: '#FD0205',
};

/** Position 0..100 du curseur sur la jauge A a G, interpolation lineaire par classe. */
function gaugePosition(ep: number, bounds: readonly number[]): number {
  const v = Math.max(0, Math.min(ep, bounds[bounds.length - 1]));
  for (let i = 0; i < bounds.length - 1; i++) {
    if (v <= bounds[i + 1]) {
      const span = bounds[i + 1] - bounds[i];
      const pos = span === 0 ? 0 : (v - bounds[i]) / span;
      return ((i + pos) / LABELS.length) * 100;
    }
  }
  return 100;
}

/** Jauge horizontale A a G avec curseur, en SVG inline. */
function DpeGauge({
  ep,
  label,
  bounds,
  ariaLabel,
}: {
  ep: number;
  label: EnergyLabel;
  bounds: readonly number[];
  ariaLabel: string;
}) {
  const width = 340;
  const height = 26;
  const segWidth = width / LABELS.length;
  const markerX = (gaugePosition(ep, bounds) / 100) * width;
  return (
    <svg
      className="dpe-gauge"
      viewBox={`0 0 ${width} ${height + 18}`}
      role="img"
      aria-label={`${ariaLabel} ${label}`}
    >
      {LABELS.map((l, i) => (
        <g key={l}>
          <rect
            x={i * segWidth + 1}
            y={10}
            width={segWidth - 2}
            height={height - 10}
            rx={3}
            fill={LABEL_COLORS[l]}
            opacity={l === label ? 1 : 0.45}
          />
          <text
            x={i * segWidth + segWidth / 2}
            y={height}
            textAnchor="middle"
            fontSize="10"
            fontWeight={l === label ? 700 : 400}
            fill="#232323"
          >
            {l}
          </text>
        </g>
      ))}
      <polygon
        points={`${markerX - 6},0 ${markerX + 6},0 ${markerX},10`}
        fill="#273F3F"
      />
    </svg>
  );
}

/** Onglet certificat : etiquette, jauge, chiffres annuels, reglementation. */
export default function DpeTab({ building, region }: DpeTabProps) {
  const c = building.certificate;
  const t = stringsFor(region.language).certificate;
  const items = region.content.regulation.filter((r) => r.relevance.includes('certificate'));
  const bounds = gaugeBounds(region.engineProfile);

  return (
    <>
      <section className="detail-panel__section">
        <h3>{t.labelsTitle}</h3>
        <div className="dpe-hero">
          <div className="dpe-hero__badges">
            <div className="dpe-hero__badge-block">
              <span className="card__label">{t.energy}</span>
              <span className={`dpe-badge dpe-badge--lg dpe-${c.label.toLowerCase()}`}>
                {c.label}
              </span>
            </div>
            <div className="dpe-hero__badge-block">
              <span className="card__label">{t.climate}</span>
              <span className={`dpe-badge dpe-badge--lg dpe-${c.gesLabel.toLowerCase()}`}>
                {c.gesLabel}
              </span>
            </div>
          </div>
          <div className="dpe-hero__values">
            <p>
              <strong>{formatEp(c.ep)}</strong> {t.primaryEnergySuffix}
            </p>
            <p>
              <strong>{formatGes(c.ges)}</strong> {t.gesSuffix}
            </p>
          </div>
        </div>
        <DpeGauge ep={c.ep} label={c.label} bounds={bounds} ariaLabel={t.gaugeAriaLabel} />
        <p className="note">{t.note}</p>
      </section>

      <section className="detail-panel__section">
        <h3>{t.annualTitle}</h3>
        <div className="stat-grid">
          <div className="card">
            <p className="card__label">{t.annualConsumption}</p>
            <p className="card__value">{formatAnnualKwh(building.annualConsumptionKwhEp)}</p>
          </div>
          <div className="card">
            <p className="card__label">{t.annualEmissions}</p>
            <p className="card__value">{formatAnnualGes(building.annualGesKgCo2)}</p>
          </div>
          <div className="card">
            <p className="card__label">{t.annualCost}</p>
            <p className="card__value">{formatCurrency(building.annualEnergyCostEur)}</p>
          </div>
        </div>
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
