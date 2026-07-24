import type { Building } from '../../types';
import {
  coolingLabel,
  energyLabel,
  formatArea,
  formatMeters,
  formatUValue,
  glazingLabel,
  inertiaLabel,
  roofTypeLabel,
  systemKindLabel,
  usageLabel,
  ventilationLabel,
  wallInsulationLabel,
  wallMaterialLabel,
} from '../../utils/format';

interface CharacteristicsTabProps {
  building: Building;
}

interface Row {
  label: string;
  value: string;
}

function Group({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="detail-panel__section">
      <h3>
        {title} <span className="source-tag">Source: ResStock</span>
      </h3>
      <dl className="card kv-list">
        {rows.map((row) => (
          <div key={row.label} className="kv-list__row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function describeSystem(kind: string, energy: string, ageYears: number): string {
  return `${systemKindLabel(kind)} (${energyLabel(energy)}, ${ageYears} year${
    ageYears > 1 ? 's' : ''
  } old)`;
}

/** Characteristics tab: general, envelope, systems. */
export default function CharacteristicsTab({ building }: CharacteristicsTabProps) {
  const b = building;
  const e = b.envelope;
  const s = b.systems;

  return (
    <>
      <Group
        title="General"
        rows={[
          { label: 'Address', value: `${b.address}, ${b.city}, ${b.postcode}` },
          { label: 'Rating registry ID', value: b.nationalDbId },
          { label: 'Building ID', value: b.registryId },
          { label: 'Building type', value: usageLabel(b.usage) },
          { label: 'Year built', value: String(b.constructionYear) },
          { label: 'Conditioned floor area', value: formatArea(b.livingAreaM2) },
          { label: 'Stories', value: String(b.floors) },
          { label: 'Height', value: formatMeters(b.heightM) },
          { label: 'Housing units', value: b.housingUnits > 0 ? String(b.housingUnits) : 'N/A' },
        ]}
      />

      <Group
        title="Envelope"
        rows={[
          {
            label: 'Walls',
            value: `${wallMaterialLabel(e.wallMaterial)}, ${
              e.wallInsulation === 'aucune'
                ? 'no insulation'
                : `${wallInsulationLabel(e.wallInsulation).toLowerCase()}`
            } (${formatUValue(e.uWall)})`,
          },
          { label: 'Roof', value: `${roofTypeLabel(e.roofType)} (${formatUValue(e.uRoof)})` },
          { label: 'Floor', value: formatUValue(e.uFloor) },
          {
            label: 'Windows and glazing',
            value: `${glazingLabel(e.glazingType)}, ${Math.round(e.glazingRatio * 100)} % glazed area`,
          },
          {
            label: 'Solar shading',
            value: e.solarProtection ? 'Present' : 'Absent',
          },
          { label: 'Thermal mass', value: inertiaLabel(e.inertia) },
        ]}
      />

      <Group
        title="Systems"
        rows={[
          {
            label: 'Primary heating',
            value: describeSystem(s.heating.kind, s.heating.energy, s.heating.ageYears),
          },
          {
            label: 'Secondary heating',
            value: s.heatingSecondary
              ? describeSystem(
                  s.heatingSecondary.kind,
                  s.heatingSecondary.energy,
                  s.heatingSecondary.ageYears,
                )
              : 'None',
          },
          {
            label: 'Water heating',
            value: describeSystem(s.dhw.kind, s.dhw.energy, s.dhw.ageYears),
          },
          {
            label: 'Cooling',
            value: s.cooling ? coolingLabel(s.cooling) : 'None',
          },
          { label: 'Ventilation', value: ventilationLabel(s.ventilation) },
          {
            label: 'Solar PV',
            value: s.pvSurfaceM2 > 0 ? formatArea(s.pvSurfaceM2) : 'None',
          },
        ]}
      />
    </>
  );
}
