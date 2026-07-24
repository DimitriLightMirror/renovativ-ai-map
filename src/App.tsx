import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Building } from './types';
import { getCached, loadRegion, statsOf } from './data';
import { DEFAULT_REGION_ID, REGIONS, getRegion, type RegionId } from './regions';
import { stringsFor } from './regions/i18n';
import { setFormatConfig } from './utils/format';
import MapView, { type FocusRequest, type MapColorMode } from './components/MapView';
import SearchBar from './components/SearchBar';
import BuildingPanel from './components/BuildingPanel';
import { formatNumber } from './utils/format';

const logoUrl = `${import.meta.env.BASE_URL}brand/logo-terracotta.png`;

/**
 * Coquille applicative : en-tete avec selecteur de pays, carte plein ecran,
 * panneau de diagnostic et pied de page statistiques. La region active
 * pilote les donnees, la langue, la devise et la reglementation affichees.
 */
export default function App() {
  const [regionId, setRegionId] = useState<RegionId>(DEFAULT_REGION_ID);
  const region = getRegion(regionId);
  const t = stringsFor(region.language);

  const [buildings, setBuildings] = useState<Building[]>(() => getCached(DEFAULT_REGION_ID) ?? []);
  const [loading, setLoading] = useState<boolean>(() => getCached(DEFAULT_REGION_ID) === undefined);
  const [selected, setSelected] = useState<Building | null>(null);
  const [colorMode, setColorMode] = useState<MapColorMode>('dpe');
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);

  // Locale, devise et langue des formats suivent la region active.
  useEffect(() => {
    setFormatConfig(region.locale, region.currencySymbol, region.language);
  }, [region]);

  // Chargement a la demande du JSON de la region (cache memoire ensuite).
  useEffect(() => {
    let cancelled = false;
    const cached = getCached(regionId);
    if (cached) {
      setBuildings(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadRegion(regionId)
      .then((data) => {
        if (cancelled) return;
        setBuildings(data);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [regionId]);

  const stats = useMemo(() => statsOf(buildings), [buildings]);

  const handleRegionChange = useCallback((id: RegionId) => {
    setRegionId(id);
    setSelected(null);
  }, []);

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
  const fgPct = stats.total > 0 ? Math.round((fgCount / stats.total) * 100) : 0;

  return (
    <div className="app">
      <header className="app-header">
        <img className="app-header__logo" src={logoUrl} alt="Renovativ" />
        <h1 className="app-header__title">Renovativ AI Map</h1>

        <nav
          className="region-selector"
          role="group"
          aria-label={t.header.regionSelectorLabel}
        >
          {REGIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`region-selector__btn ${r.id === regionId ? 'is-active' : ''}`}
              aria-pressed={r.id === regionId}
              title={r.name}
              onClick={() => handleRegionChange(r.id)}
            >
              {r.shortName}
            </button>
          ))}
        </nav>

        <SearchBar
          key={regionId}
          buildings={buildings}
          placeholder={t.search.placeholder}
          ariaLabel={t.search.ariaLabel}
          onPick={handleSearchPick}
        />
      </header>

      <main className="map-container">
        <MapView
          buildings={buildings}
          region={region}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
          focusRequest={focusRequest}
        />

        {loading && (
          <div className="map-loading" role="status">
            <span className="map-loading__spinner" aria-hidden="true" />
            {t.header.loading}
          </div>
        )}

        <BuildingPanel building={selected} region={region} onClose={() => setSelected(null)} />

        <footer className="stats-bar" aria-label={t.stats.ariaLabel}>
          <span className="stats-bar__chip">
            {formatNumber(stats.total)} {t.stats.buildingsMapped}
          </span>
          <span className="stats-bar__chip">
            {Object.keys(stats.perCity).length} {t.stats.cities}
          </span>
          <span className="stats-bar__chip stats-bar__chip--alert">
            {fgPct} % {t.stats.ratedForG}
          </span>
        </footer>
      </main>
    </div>
  );
}
