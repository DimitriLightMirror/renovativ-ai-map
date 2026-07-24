import type { Building, EnergyLabel } from '../../types';
import { REGULATION_NL } from '../../content/regulation-nl';
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
}

const LABELS: EnergyLabel[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

/** Official Dutch energielabel ramp, dark green (A, incl. A++/A+) to red (G). */
const LABEL_COLORS: Record<EnergyLabel, string> = {
  A: '#0a7d33',
  B: '#4ab03a',
  C: '#a6c835',
  D: '#f6d511',
  E: '#f0a41a',
  F: '#e36a1b',
  G: '#d1231f',
};

/** Upper bound of each EP class, kWh/m2/yr. The last bound is visual only. */
const EP_BOUNDS = [0, 120, 165, 205, 250, 300, 360, 480];

/** Cursor position 0..100 on the A-to-G gauge, linear per class. */
function gaugePosition(ep: number): number {
  const v = Math.max(0, Math.min(ep, EP_BOUNDS[EP_BOUNDS.length - 1]));
  for (let i = 0; i < EP_BOUNDS.length - 1; i++) {
    if (v <= EP_BOUNDS[i + 1]) {
      const span = EP_BOUNDS[i + 1] - EP_BOUNDS[i];
      const t = span === 0 ? 0 : (v - EP_BOUNDS[i]) / span;
      return ((i + t) / LABELS.length) * 100;
    }
  }
  return 100;
}

/** Horizontal A-to-G gauge with cursor, inline SVG. */
function DpeGauge({ ep, label }: { ep: number; label: EnergyLabel }) {
  const width = 340;
  const height = 26;
  const segWidth = width / LABELS.length;
  const markerX = (gaugePosition(ep) / 100) * width;
  return (
    <svg
      className="dpe-gauge"
      viewBox={`0 0 ${width} ${height + 18}`}
      role="img"
      aria-label={`Energielabel ${label}`}
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

/** Energielabel tab: labels, gauge, annual figures, regulation. */
export default function DpeTab({ building }: DpeTabProps) {
  const c = building.certificate;
  const items = REGULATION_NL.filter((r) => r.relevance.includes('certificate'));

  return (
    <>
      <section className="detail-panel__section">
        <h3>Energielabel</h3>
        <div className="dpe-hero">
          <div className="dpe-hero__badges">
            <div className="dpe-hero__badge-block">
              <span className="card__label">Energy</span>
              <span className={`dpe-badge dpe-badge--lg dpe-${c.label.toLowerCase()}`}>
                {c.label}
              </span>
            </div>
            <div className="dpe-hero__badge-block">
              <span className="card__label">CO2 emissions</span>
              <span className={`dpe-badge dpe-badge--lg dpe-${c.gesLabel.toLowerCase()}`}>
                {c.gesLabel}
              </span>
            </div>
          </div>
          <div className="dpe-hero__values">
            <p>
              <strong>{formatEp(c.ep)}</strong> of primary energy
            </p>
            <p>
              <strong>{formatGes(c.ges)}</strong> of greenhouse gases
            </p>
          </div>
        </div>
        <DpeGauge ep={c.ep} label={c.label} />
        <p className="note">
          Primary energy per m2 of floor area. The Dutch A+++ to G scale is
          shown here collapsed onto A to G (A+++/A++/A+ display as A). This
          label is an estimate modelled from the bouwjaar and stock archetype;
          the official label lives in EP-online (RVO).
        </p>
      </section>

      <section className="detail-panel__section">
        <h3>Annual figures</h3>
        <div className="stat-grid">
          <div className="card">
            <p className="card__label">Annual consumption</p>
            <p className="card__value">{formatAnnualKwh(building.annualConsumptionKwhEp)}</p>
          </div>
          <div className="card">
            <p className="card__label">Annual emissions</p>
            <p className="card__value">{formatAnnualGes(building.annualGesKgCo2)}</p>
          </div>
          <div className="card">
            <p className="card__label">Annual energy cost</p>
            <p className="card__value">{formatCurrency(building.annualEnergyCostEur)}</p>
          </div>
        </div>
      </section>

      <section className="detail-panel__section">
        <h3>Applicable regulation</h3>
        {items.map((item) => (
          <RegulationCard key={item.key} item={item} />
        ))}
      </section>
    </>
  );
}
