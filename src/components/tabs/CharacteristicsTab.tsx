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
        {title} <span className="source-tag">Source : BDNB</span>
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
  return `${systemKindLabel(kind)} (${energyLabel(energy)}, ${ageYears} an${
    ageYears > 1 ? 's' : ''
  })`;
}

/** Onglet Caracteristiques : general, enveloppe, systemes. */
export default function CharacteristicsTab({ building }: CharacteristicsTabProps) {
  const b = building;
  const e = b.envelope;
  const s = b.systems;

  return (
    <>
      <Group
        title="Général"
        rows={[
          { label: 'Adresse', value: `${b.address}, ${b.postcode} ${b.city}` },
          { label: 'Identifiant BDNB', value: b.nationalDbId },
          { label: 'Identifiant RNB', value: b.registryId },
          { label: 'Usage', value: usageLabel(b.usage) },
          { label: 'Année de construction', value: String(b.constructionYear) },
          { label: 'Surface de plancher', value: formatArea(b.livingAreaM2) },
          { label: 'Niveaux', value: String(b.floors) },
          { label: 'Hauteur', value: formatMeters(b.heightM) },
          { label: 'Logements', value: b.housingUnits > 0 ? String(b.housingUnits) : 'Sans objet' },
        ]}
      />

      <Group
        title="Enveloppe"
        rows={[
          {
            label: 'Murs',
            value: `${wallMaterialLabel(e.wallMaterial)}, isolation ${wallInsulationLabel(
              e.wallInsulation,
            ).toLowerCase()} (${formatUValue(e.uWall)})`,
          },
          { label: 'Toiture', value: `${roofTypeLabel(e.roofType)} (${formatUValue(e.uRoof)})` },
          { label: 'Plancher bas', value: formatUValue(e.uFloor) },
          {
            label: 'Baies et vitrage',
            value: `${glazingLabel(e.glazingType)}, ${Math.round(e.glazingRatio * 100)} % de surface vitrée`,
          },
          {
            label: 'Protections solaires',
            value: e.solarProtection ? 'Présentes' : 'Absentes',
          },
          { label: 'Inertie', value: inertiaLabel(e.inertia) },
        ]}
      />

      <Group
        title="Systèmes"
        rows={[
          {
            label: 'Chauffage principal',
            value: describeSystem(s.heating.kind, s.heating.energy, s.heating.ageYears),
          },
          {
            label: 'Chauffage secondaire',
            value: s.heatingSecondary
              ? describeSystem(
                  s.heatingSecondary.kind,
                  s.heatingSecondary.energy,
                  s.heatingSecondary.ageYears,
                )
              : 'Aucun',
          },
          {
            label: 'Eau chaude sanitaire',
            value: describeSystem(s.dhw.kind, s.dhw.energy, s.dhw.ageYears),
          },
          {
            label: 'Refroidissement',
            value: s.cooling ? coolingLabel(s.cooling) : 'Aucun',
          },
          { label: 'Ventilation', value: ventilationLabel(s.ventilation) },
          {
            label: 'Photovoltaïque',
            value: s.pvSurfaceM2 > 0 ? formatArea(s.pvSurfaceM2) : 'Aucun',
          },
        ]}
      />
    </>
  );
}
