import { useEffect, useState } from 'react';
import type { Building } from '../types';
import { COUNTRY } from '../config/country';
import CharacteristicsTab from './tabs/CharacteristicsTab';
import DpeTab from './tabs/DpeTab';
import RenovationTab from './tabs/RenovationTab';
import HeatwaveTab from './tabs/HeatwaveTab';
import { usageLabel } from '../utils/format';

interface BuildingPanelProps {
  building: Building | null;
  onClose: () => void;
}

type TabKey = 'characteristics' | 'dpe' | 'renovation' | 'heatwave';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'characteristics', label: 'Characteristics' },
  { key: 'dpe', label: COUNTRY.certificateName },
  { key: 'renovation', label: 'Renovation' },
  { key: 'heatwave', label: 'Heatwave' },
];

/**
 * Right-hand side panel: diagnostic of the selected building,
 * four tabs (characteristics, EPC, renovation, heatwave).
 */
export default function BuildingPanel({ building, onClose }: BuildingPanelProps) {
  const [tab, setTab] = useState<TabKey>('characteristics');

  // Back to the first tab when the building changes.
  useEffect(() => {
    setTab('characteristics');
  }, [building?.id]);

  return (
    <aside
      className={`detail-panel ${building ? 'is-open' : ''}`}
      aria-label="Building diagnostic"
      aria-hidden={!building}
    >
      {building && (
        <>
          <button
            type="button"
            className="detail-panel__close"
            aria-label="Close the panel"
            onClick={onClose}
          >
            ×
          </button>

          <header className="detail-panel__header">
            <h2 className="detail-panel__address">{building.address}</h2>
            <p className="detail-panel__city">
              {building.city} {building.postcode} · {usageLabel(building.usage)}
            </p>
          </header>

          <nav className="tab-bar" aria-label="Diagnostic tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`tab-bar__tab ${tab === t.key ? 'is-active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="detail-panel__content">
            {tab === 'characteristics' && <CharacteristicsTab building={building} />}
            {tab === 'dpe' && <DpeTab building={building} />}
            {tab === 'renovation' && <RenovationTab building={building} />}
            {tab === 'heatwave' && <HeatwaveTab building={building} />}
          </div>
        </>
      )}
    </aside>
  );
}
