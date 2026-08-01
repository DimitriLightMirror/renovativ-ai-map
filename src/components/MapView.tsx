import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Building } from '../types';
import type { RegionConfig } from '../regions';
import { stringsFor } from '../regions/i18n';
import { classifyDh, labelColor } from '../engine';

export type MapColorMode = 'dpe' | 'comfort';

export interface FocusRequest {
  lat: number;
  lng: number;
  seq: number;
}

interface MapViewProps {
  buildings: Building[];
  region: RegionConfig;
  colorMode: MapColorMode;
  onColorModeChange: (mode: MapColorMode) => void;
  selectedId: string | null;
  onSelect: (building: Building) => void;
  focusRequest: FocusRequest | null;
}

const DPE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

/** Marker radius shrinks at low zoom so 12k points stay readable. */
function radiusForZoom(zoom: number): number {
  if (zoom < 10) return 2.5;
  if (zoom < 12) return 3.5;
  if (zoom < 14) return 4.5;
  return 5.5;
}

function markerColor(building: Building, mode: MapColorMode): string {
  if (mode === 'dpe') return labelColor(building.certificate.label);
  return classifyDh(building.comfort.dh2050).color;
}

/**
 * Carte Leaflet du parc bati de la region active.
 * Coloration par etiquette du certificat national ou par confort d'ete
 * a l'horizon 2050. Au changement de region, les marqueurs sont remplaces
 * et la carte vole vers le nouveau centre.
 */
export default function MapView({
  buildings,
  region,
  colorMode,
  onColorModeChange,
  selectedId,
  onSelect,
  focusRequest,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const buildingsRef = useRef<Map<string, Building>>(new Map());
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  const colorModeRef = useRef<MapColorMode>(colorMode);
  colorModeRef.current = colorMode;
  const [infoOpen, setInfoOpen] = useState(false);

  const t = stringsFor(region.language);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Creation de la carte, une seule fois.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: region.mapCenter,
      zoom: region.mapZoom,
      zoomControl: true,
      // Canvas rendering keeps 12k circleMarkers fluid (SVG would crawl).
      preferCanvas: true,
      renderer: L.canvas({ padding: 0.5 }),
    });
    tileLayerRef.current = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: t.map.osmAttribution,
    }).addTo(map);
    // Scale marker radius with zoom level (keep the selection ring visible).
    const applyRadii = () => {
      const r = radiusForZoom(map.getZoom());
      for (const [id, marker] of markersRef.current) {
        marker.setStyle({ radius: id === selectedIdRef.current ? 8 : r });
      }
    };
    map.on('zoomend', applyRadii);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      buildingsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vol vers le centre de la region quand elle change + attribution OSM localisee.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo(region.mapCenter, region.mapZoom, { duration: 1.2 });
    const prev = tileLayerRef.current;
    if (prev) {
      map.removeLayer(prev);
      tileLayerRef.current = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: t.map.osmAttribution,
      }).addTo(map);
    }
  }, [region, t.map.osmAttribution]);

  // Synchronisation des marqueurs avec les batiments de la region active :
  // suppression des anciens, ajout des nouveaux.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    const nextIds = new Set(buildings.map((b) => b.id));

    for (const [id, marker] of markers) {
      if (!nextIds.has(id)) {
        marker.remove();
        markers.delete(id);
        buildingsRef.current.delete(id);
      }
    }

    for (const b of buildings) {
      if (markers.has(b.id)) continue;
      buildingsRef.current.set(b.id, b);
      const marker = L.circleMarker([b.lat, b.lng], {
        radius: radiusForZoom(map.getZoom()),
        fillOpacity: 0.85,
        weight: 1,
        color: '#ffffff',
        fillColor: markerColor(b, colorModeRef.current),
      });
      marker.on('click', () => onSelect(b));
      marker.bindTooltip(`${b.address}, ${b.city}`, { direction: 'top', sticky: true });
      marker.addTo(map);
      markers.set(b.id, marker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings]);

  // Recoloration quand le mode change.
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const b = buildingsRef.current.get(id);
      if (!b) continue;
      marker.setStyle({ fillColor: markerColor(b, colorMode) });
    }
  }, [colorMode]);

  // Anneau terracotta sur le marqueur selectionne.
  useEffect(() => {
    const zoom = mapRef.current?.getZoom() ?? region.mapZoom;
    for (const [id, marker] of markersRef.current) {
      const isSelected = id === selectedId;
      marker.setStyle(
        isSelected
          ? { weight: 3, color: '#b35540', radius: 8 }
          : { weight: 1, color: '#ffffff', radius: radiusForZoom(zoom) },
      );
      if (isSelected) marker.bringToFront();
    }
  }, [selectedId, region]);

  // Vol vers une adresse recherchee.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusRequest) return;
    map.flyTo([focusRequest.lat, focusRequest.lng], 17, { duration: 1.2 });
  }, [focusRequest]);

  return (
    <>
      <div ref={containerRef} className="map-leaflet" aria-label={t.map.ariaLabel} />

      <div className="map-controls card">
        <div className="map-controls__toggle" role="group" aria-label={t.map.colorToggleAriaLabel}>
          <button
            type="button"
            className={`btn btn-sm ${colorMode === 'dpe' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => onColorModeChange('dpe')}
          >
            {region.certificateShortName}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${colorMode === 'comfort' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => onColorModeChange('comfort')}
          >
            {t.map.colorComfort}
          </button>
        </div>

        <div className="map-legend" aria-label={t.map.legendAriaLabel}>
          {colorMode === 'dpe'
            ? DPE_LABELS.map((label) => (
                <span key={label} className="map-legend__item">
                  <span
                    className="map-legend__swatch"
                    style={{ backgroundColor: labelColor(label) }}
                  />
                  {label}
                </span>
              ))
            : t.map.comfortLegend.map((item) => (
                <span key={item.label} className="map-legend__item">
                  <span
                    className="map-legend__swatch"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </span>
              ))}
          {colorMode === 'comfort' && (
            <span className="map-legend__note">{t.map.horizonNote}</span>
          )}
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm map-controls__more"
          aria-expanded={infoOpen}
          onClick={() => setInfoOpen((v) => !v)}
        >
          {infoOpen ? t.map.moreInfoHide : t.map.moreInfoShow}
        </button>

        {infoOpen && (
          <div className="map-info">
            <p>
              {colorMode === 'dpe'
                ? t.map.infoCertificate.replace('{certificate}', region.certificateName)
                : t.map.infoComfort}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
