import { useCallback, useMemo, useState } from 'react';
import type { Building } from './types';
import { getBuildings, getStats } from './data';
import MapView, { type FocusRequest, type MapColorMode } from './components/MapView';
import SearchBar from './components/SearchBar';
import BuildingPanel from './components/BuildingPanel';
import { formatNumber } from './utils/format';

const logoUrl = `${import.meta.env.BASE_URL}brand/logo-terracotta.png`;

/**
 * Application shell: header, full-screen map, diagnostic panel
 * and statistics footer. The building selection lives here.
 */
export default function App() {
  const buildings = useMemo(() => getBuildings(), []);
  const stats = useMemo(() => getStats(), []);
  const [selected, setSelected] = useState<Building | null>(null);
  const [colorMode, setColorMode] = useState<MapColorMode>('dpe');
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);

  const handleSelect = useCallback((building: Building) => {
    setSelected(building);
  }, []);

  const handleSearchPick = useCallback((building: Building) => {
    setSelected(building);
    setFocusRequest((prev) => ({
      lat: building.lat,
      lng: building.lng,
      seq: (prev?.seq ?? 0) + 1,
    }));
  }, []);

  const fgCount = stats.perLabel.F + stats.perLabel.G;
  const fgPct = Math.round((fgCount / stats.total) * 100);

  return (
    <div className="app">
      <header className="app-header">
        <img className="app-header__logo" src={logoUrl} alt="Renovativ" />
        <h1 className="app-header__title">Renovativ AI Map</h1>
        <SearchBar onPick={handleSearchPick} />
      </header>

      <main className="map-container">
        <MapView
          buildings={buildings}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
          focusRequest={focusRequest}
        />

        <BuildingPanel building={selected} onClose={() => setSelected(null)} />

        <footer className="stats-bar" aria-label="Building stock statistics">
          <span className="stats-bar__chip">
            {formatNumber(stats.total)} buildings mapped
          </span>
          <span className="stats-bar__chip">
            {Object.keys(stats.perCity).length} metro areas
          </span>
          <span className="stats-bar__chip stats-bar__chip--alert">
            {fgPct} % rated F or G
          </span>
        </footer>
      </main>
    </div>
  );
}
