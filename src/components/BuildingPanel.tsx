import { useEffect, useState } from 'react';
import type { Building } from '../types';
import type { RegionConfig } from '../regions';
import { stringsFor } from '../regions/i18n';
import CharacteristicsTab from './tabs/CharacteristicsTab';
import DpeTab from './tabs/DpeTab';
import RenovationTab from './tabs/RenovationTab';
import HeatwaveTab from './tabs/HeatwaveTab';
import { usageLabel } from '../utils/format';

interface BuildingPanelProps {
  building: Building | null;
  region: RegionConfig;
  onClose: () => void;
}

type TabKey = 'characteristics' | 'dpe' | 'renovation' | 'heatwave';

/**
 * Panneau lateral droit : diagnostic du batiment selectionne,
 * quatre onglets (caracteristiques, certificat, renovation, canicule).
 * Langue, certificat, reglementation et devise suivent la region active.
 */
export default function BuildingPanel({ building, region, onClose }: BuildingPanelProps) {
  const [tab, setTab] = useState<TabKey>('characteristics');
  const t = stringsFor(region.language);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'characteristics', label: t.panel.tabCharacteristics },
    { key: 'dpe', label: region.certificateName },
    { key: 'renovation', label: t.panel.tabRenovation },
    { key: 'heatwave', label: t.panel.tabHeatwave },
  ];

  // Retour au premier onglet quand on change de batiment ou de region.
  useEffect(() => {
    setTab('characteristics');
  }, [building?.id, region.id]);

  return (
    <aside
      className={`detail-panel ${building ? 'is-open' : ''}`}
      aria-label={t.panel.ariaLabel}
      aria-hidden={!building}
    >
      {building && (
        <>
          <button
            type="button"
            className="detail-panel__close"
            aria-label={t.panel.closeAriaLabel}
            onClick={onClose}
          >
            ×
          </button>

          <header className="detail-panel__header">
            <h2 className="detail-panel__address">{building.address}</h2>
            <p className="detail-panel__city">
              {building.postcode} {building.city} · {usageLabel(building.usage)}
            </p>
          </header>

          <nav className="tab-bar" aria-label={t.panel.tabsAriaLabel}>
            {TABS.map((tabDef) => (
              <button
                key={tabDef.key}
                type="button"
                className={`tab-bar__tab ${tab === tabDef.key ? 'is-active' : ''}`}
                onClick={() => setTab(tabDef.key)}
              >
                {tabDef.label}
              </button>
            ))}
          </nav>

          <div className="detail-panel__content">
            {tab === 'characteristics' && <CharacteristicsTab building={building} region={region} />}
            {tab === 'dpe' && <DpeTab building={building} region={region} />}
            {tab === 'renovation' && <RenovationTab building={building} region={region} />}
            {tab === 'heatwave' && <HeatwaveTab building={building} region={region} />}

            <p className="note detail-panel__disclaimer">{region.disclaimer}</p>
          </div>
        </>
      )}
    </aside>
  );
}
