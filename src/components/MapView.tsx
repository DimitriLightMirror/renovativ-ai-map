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
  { color: '#2E9E5B', label: 'Confortable' },
  { color: '#E3C41C', label: 'Inconfort modéré' },
  { color: '#E8842C', label: 'Inconfort fort' },
  { color: '#D0342C', label: 'Inconfort sévère' },
];

const DPE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

function markerColor(building: Building, mode: MapColorMode): string {
  if (mode === 'dpe') return labelColor(building.certificate.label);
  return classifyDh(building.comfort.dh2050).color;
}

/**
 * Carte Leaflet du parc bati francais.
 * Coloration par etiquette DPE ou par confort d'ete a l'horizon 2050.
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

  // Creation de la carte, une seule fois.
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
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributeurs',
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Creation des marqueurs, une seule fois (le jeu de donnees est statique).
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

  // Vol vers une adresse recherchee.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusRequest) return;
    map.flyTo([focusRequest.lat, focusRequest.lng], 17, { duration: 1.2 });
  }, [focusRequest]);

  return (
    <>
      <div ref={containerRef} className="map-leaflet" aria-label="Carte du parc bâti français" />

      <div className="map-controls card">
        <div className="map-controls__toggle" role="group" aria-label="Coloration de la carte">
          <button
            type="button"
            className={`btn btn-sm ${colorMode === 'dpe' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => onColorModeChange('dpe')}
          >
            DPE
          </button>
          <button
            type="button"
            className={`btn btn-sm ${colorMode === 'comfort' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => onColorModeChange('comfort')}
          >
            Confort d’été
          </button>
        </div>

        <div className="map-legend" aria-label="Légende de la carte">
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
            <span className="map-legend__note">Horizon 2050</span>
          )}
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm map-controls__more"
          aria-expanded={infoOpen}
          onClick={() => setInfoOpen((v) => !v)}
        >
          {infoOpen ? 'Masquer l’explication' : 'Pour en savoir plus'}
        </button>

        {infoOpen && (
          <div className="map-info">
            {colorMode === 'dpe' ? (
              <p>
                Le DPE classe chaque bâtiment de A à G selon sa consommation
                d’énergie primaire et ses émissions de CO2. La classe retenue
                est la moins bonne des deux. G signale une passoire thermique.
              </p>
            ) : (
              <p>
                Le confort d’été mesure les degrés-heures d’inconfort : le cumul
                des dépassements de température intérieure pendant la saison
                chaude, sans climatisation. Ici, la projection tient compte du
                réchauffement attendu en 2050 et de l’îlot de chaleur urbain.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
