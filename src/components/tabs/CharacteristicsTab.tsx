import type { Building } from '../../types';
import type { RegionConfig } from '../../regions';
import { stringsFor } from '../../regions/i18n';
import {
  coolingLabel,
  energyLabel,
  formatAge,
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
  region: RegionConfig;
}

interface Row {
  label: string;
  value: string;
}

function Group({ title, source, rows }: { title: string; source: string; rows: Row[] }) {
  return (
    <section className="detail-panel__section">
      <h3>
        {title} <span className="source-tag">{source}</span>
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
  return `${systemKindLabel(kind)} (${energyLabel(energy)}, ${formatAge(ageYears)})`;
}

/** Onglet Caracteristiques : general, enveloppe, systemes. */
export default function CharacteristicsTab({ building, region }: CharacteristicsTabProps) {
  const b = building;
  const e = b.envelope;
  const s = b.systems;
  const t = stringsFor(region.language).characteristics;
  const source = `${t.sourcePrefix}${region.sourceName}`;

  return (
    <>
      <Group
        title={t.general}
        source={source}
        rows={[
          { label: t.address, value: `${b.address}, ${b.postcode} ${b.city}` },
          { label: t.nationalId, value: b.nationalDbId },
          { label: t.registryId, value: b.registryId || t.notApplicable },
          { label: t.usage, value: usageLabel(b.usage) },
          { label: t.constructionYear, value: String(b.constructionYear) },
          { label: t.floorArea, value: formatArea(b.livingAreaM2) },
          { label: t.floors, value: String(b.floors) },
          { label: t.height, value: formatMeters(b.heightM) },
          {
            label: t.housingUnits,
            value: b.housingUnits > 0 ? String(b.housingUnits) : t.notApplicable,
          },
        ]}
      />

      <Group
        title={t.envelope}
        source={source}
        rows={[
          {
            label: t.walls,
            value: `${wallMaterialLabel(e.wallMaterial)}, ${t.insulationWord} ${wallInsulationLabel(
              e.wallInsulation,
            ).toLowerCase()} (${formatUValue(e.uWall)})`,
          },
          { label: t.roof, value: `${roofTypeLabel(e.roofType)} (${formatUValue(e.uRoof)})` },
          { label: t.groundFloor, value: formatUValue(e.uFloor) },
          {
            label: t.glazing,
            value: `${glazingLabel(e.glazingType)}, ${Math.round(e.glazingRatio * 100)} ${t.glazingRatioSuffix}`,
          },
          {
            label: t.solarProtection,
            value: e.solarProtection ? t.present : t.absent,
          },
          { label: t.inertia, value: inertiaLabel(e.inertia) },
        ]}
      />

      <Group
        title={t.systems}
        source={source}
        rows={[
          {
            label: t.mainHeating,
            value: describeSystem(s.heating.kind, s.heating.energy, s.heating.ageYears),
          },
          {
            label: t.secondaryHeating,
            value: s.heatingSecondary
              ? describeSystem(
                  s.heatingSecondary.kind,
                  s.heatingSecondary.energy,
                  s.heatingSecondary.ageYears,
                )
              : t.none,
          },
          {
            label: t.dhw,
            value: describeSystem(s.dhw.kind, s.dhw.energy, s.dhw.ageYears),
          },
          {
            label: t.cooling,
            value: s.cooling ? coolingLabel(s.cooling) : t.none,
          },
          { label: t.ventilation, value: ventilationLabel(s.ventilation) },
          {
            label: t.pv,
            value: s.pvSurfaceM2 > 0 ? formatArea(s.pvSurfaceM2) : t.none,
          },
        ]}
      />
    </>
  );
}
