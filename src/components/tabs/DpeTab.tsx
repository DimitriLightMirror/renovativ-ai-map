import type { Building, EnergyLabel } from '../../types';
import { REGULATION_US } from '../../content/regulation-us';
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
const LABEL_COLORS: Record<EnergyLabel, string> = {
  A: '#319834',
  B: '#33CC31',
  C: '#CBFC34',
  D: '#FBFE06',
  E: '#FBCC0C',
  F: '#FC9935',
  G: '#FD0205',
};

/** Upper bounds of each HERS-style band. The last bound is visual only. */
const EP_BOUNDS = [0, 55, 70, 85, 100, 115, 130, 165];

/** Position 0..100 of the cursor on the A to G gauge, linear per band. */
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

/** Horizontal A to G gauge with cursor, inline SVG. */
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
      aria-label={`Energy band ${label}`}
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

/** HERS Index tab: band, gauge, annual figures, regulation. */
export default function DpeTab({ building }: DpeTabProps) {
  const c = building.certificate;
  const items = REGULATION_US.filter((r) => r.relevance.includes('certificate'));

  return (
    <>
      <section className="detail-panel__section">
        <h3>Rating bands</h3>
        <div className="dpe-hero">
          <div className="dpe-hero__badges">
            <div className="dpe-hero__badge-block">
              <span className="card__label">Energy</span>
              <span className={`dpe-badge dpe-badge--lg dpe-${c.label.toLowerCase()}`}>
                {c.label}
              </span>
            </div>
            <div className="dpe-hero__badge-block">
              <span className="card__label">Climate (GHG)</span>
              <span className={`dpe-badge dpe-badge--lg dpe-${c.gesLabel.toLowerCase()}`}>
                {c.gesLabel}
              </span>
            </div>
          </div>
          <div className="dpe-hero__values">
            <p>
              <strong>{formatEp(c.ep)}</strong> HERS-style index
            </p>
            <p>
              <strong>{formatGes(c.ges)}</strong> of greenhouse gases
            </p>
          </div>
        </div>
        <DpeGauge ep={c.ep} label={c.label} />
        <p className="note">
          HERS-style index: 100 is the 2006 IECC reference new home, 0 is net
          zero. Typical existing US homes score 120 to 150. The final band is
          the worse of the energy and climate bands.
        </p>
      </section>

      <section className="detail-panel__section">
        <h3>Annual figures</h3>
        <div className="stat-grid">
          <div className="card">
            <p className="card__label">Annual energy use</p>
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
        <h3>Applicable standards</h3>
        {items.map((item) => (
          <RegulationCard key={item.key} item={item} />
        ))}
      </section>
    </>
  );
}
