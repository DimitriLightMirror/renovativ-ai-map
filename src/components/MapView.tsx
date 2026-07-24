import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Building } from '../types';
import { COUNTRY } from '../config/country';
import { classifyDh, labelColor } from '../engine';

export type MapColorMode = 'dpe' | 'comfort';

export interface FocusRequest {
  lat: number;
  lng: number;
  seq: number;
}

interface MapViewProps {
  buildings: Building[];
  colorMode: MapColorMode;
  onColorModeChange: (mode: MapColorMode) => void;
  selectedId: string | null;
  onSelect: (building: Building) => void;
  focusRequest: FocusRequest | null;
}

const COMFORT_LEGEND: { color: string; label: string }[] = [
  { color: '#2E9E5B', label: 'Comfortable' },
  { color: '#E3C41C', label: 'Moderate discomfort' },
  { color: '#E8842C', label: 'High discomfort' },
  { color: '#D0342C', label: 'Severe discomfort' },
];

const DPE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

/** Marker radius shrinks at low zoom so thousands of points stay readable. */
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
 * Leaflet map of the Dutch building stock.
 * Colored by energielabel or by summer comfort at the 2050 horizon.
 */
export default function MapView({
  buildings,
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
  const [infoOpen, setInfoOpen] = useState(false);

  // Map creation, once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: COUNTRY.mapCenter,
      zoom: COUNTRY.mapZoom,
      zoomControl: true,
      // Canvas rendering keeps thousands of circleMarkers fluid (SVG would crawl).
      preferCanvas: true,
      renderer: L.canvas({ padding: 0.5 }),
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
    };
  }, []);

  // Marker creation, once (the dataset is static).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    for (const b of buildings) {
      if (markers.has(b.id)) continue;
      buildingsRef.current.set(b.id, b);
      const marker = L.circleMarker([b.lat, b.lng], {
        radius: radiusForZoom(map.getZoom()),
        fillOpacity: 0.85,
        weight: 1,
        color: '#ffffff',
        fillColor: markerColor(b, 'dpe'),
      });
      marker.on('click', () => onSelect(b));
      marker.bindTooltip(`${b.address}, ${b.city}`, { direction: 'top', sticky: true });
      marker.addTo(map);
      markers.set(b.id, marker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings]);

  // Recolor when the mode changes.
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const b = buildingsRef.current.get(id);
      if (!b) continue;
      marker.setStyle({ fillColor: markerColor(b, colorMode) });
    }
  }, [colorMode]);

  // Terracotta ring on the selected marker.
  useEffect(() => {
    const zoom = mapRef.current?.getZoom() ?? COUNTRY.mapZoom;
    for (const [id, marker] of markersRef.current) {
      const isSelected = id === selectedId;
      marker.setStyle(
        isSelected
          ? { weight: 3, color: '#b35540', radius: 8 }
          : { weight: 1, color: '#ffffff', radius: radiusForZoom(zoom) },
      );
      if (isSelected) marker.bringToFront();
    }
  }, [selectedId]);

  // Fly to a searched address.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusRequest) return;
    map.flyTo([focusRequest.lat, focusRequest.lng], 17, { duration: 1.2 });
  }, [focusRequest]);

  return (
    <>
      <div ref={containerRef} className="map-leaflet" aria-label="Map of the Dutch building stock" />

      <div className="map-controls card">
        <div className="map-controls__toggle" role="group" aria-label="Map coloring">
          <button
            type="button"
            className={`btn btn-sm ${colorMode === 'dpe' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => onColorModeChange('dpe')}
          >
            Energielabel
          </button>
          <button
            type="button"
            className={`btn btn-sm ${colorMode === 'comfort' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => onColorModeChange('comfort')}
          >
            Summer comfort
          </button>
        </div>

        <div className="map-legend" aria-label="Map legend">
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
            : COMFORT_LEGEND.map((item) => (
                <span key={item.label} className="map-legend__item">
                  <span
                    className="map-legend__swatch"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </span>
              ))}
          {colorMode === 'comfort' && (
            <span className="map-legend__note">2050 horizon</span>
          )}
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm map-controls__more"
          aria-expanded={infoOpen}
          onClick={() => setInfoOpen((v) => !v)}
        >
          {infoOpen ? 'Hide the explanation' : 'Learn more'}
        </button>

        {infoOpen && (
          <div className="map-info">
            {colorMode === 'dpe' ? (
              <p>
                The energielabel rates each building from A (best, covering the
                official A+++/A++/A+ classes) to G (worst) on energy performance,
                registered in EP-online (RVO). Labels E, F and G fall below the
                2030 rental target of label C. Labels in this demo are modelled
                estimates from BAG bouwjaar data.
              </p>
            ) : (
              <p>
                Summer comfort is measured in degree-hours of discomfort: the
                cumulated indoor temperature excess over the hot season, without
                cooling. This projection includes the warming expected by 2050
                and the urban heat island. Dutch regulation uses the TOjuli
                indicator (NTA 8800) for new buildings.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
