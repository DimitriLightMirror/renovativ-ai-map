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

const EPC_BANDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

function markerColor(building: Building, mode: MapColorMode): string {
  if (mode === 'dpe') return labelColor(building.certificate.label);
  return classifyDh(building.comfort.dh2050).color;
}

/**
 * Leaflet map of the UK building stock.
 * Coloured by EPC band or by summer comfort at the 2050 horizon.
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
  const [infoOpen, setInfoOpen] = useState(false);

  // Map creation, once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: COUNTRY.mapCenter,
      zoom: COUNTRY.mapZoom,
      zoomControl: true,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
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
        radius: 5,
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

  // Recolouring when the mode changes.
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const b = buildingsRef.current.get(id);
      if (!b) continue;
      marker.setStyle({ fillColor: markerColor(b, colorMode) });
    }
  }, [colorMode]);

  // Terracotta ring on the selected marker.
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const isSelected = id === selectedId;
      marker.setStyle(
        isSelected
          ? { weight: 3, color: '#b35540', radius: 8 }
          : { weight: 1, color: '#ffffff', radius: 5 },
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
      <div ref={containerRef} className="map-leaflet" aria-label="Map of the UK building stock" />

      <div className="map-controls card">
        <div className="map-controls__toggle" role="group" aria-label="Map colouring">
          <button
            type="button"
            className={`btn btn-sm ${colorMode === 'dpe' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => onColorModeChange('dpe')}
          >
            EPC
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
            ? EPC_BANDS.map((label) => (
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
          {infoOpen ? 'Hide the explanation' : 'Find out more'}
        </button>

        {infoOpen && (
          <div className="map-info">
            {colorMode === 'dpe' ? (
              <p>
                The EPC rates every building from A to G on its energy use and
                its CO2 emissions. The headline band is the worse of the two.
                G marks the least efficient homes, often called fuel-poor stock.
              </p>
            ) : (
              <p>
                Summer comfort counts the overheating degree-hours: the sum of
                indoor temperature exceedances over the hot season, without air
                conditioning. The projection shown here includes the warming
                expected by 2050 and the urban heat island effect.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
