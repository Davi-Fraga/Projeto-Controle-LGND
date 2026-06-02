'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import type { MapChurch } from './api';

type Props = { churches: MapChurch[] };

// Centro aproximado da Rota do Cerrado (Brasília / Planalto Central)
const DEFAULT_CENTER: [number, number] = [-15.7939, -47.8828];
const DEFAULT_ZOOM = 6;

type PlottableChurch = MapChurch & { latitude: number; longitude: number };

function hasCoords(church: MapChurch): church is PlottableChurch {
  return church.latitude != null && church.longitude != null;
}

function FitBounds({ points }: { points: PlottableChurch[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 12);
      return;
    }
    const bounds = new LatLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
  }, [map, points]);

  return null;
}

export default function RotaMap({ churches }: Props) {
  const points = churches.filter(hasCoords);
  const maxCount = points.reduce((max, p) => Math.max(max, p.count), 1);

  return (
    <div className="relative">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        style={{ height: '480px', width: '100%', borderRadius: '0.75rem', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {points.map((church) => {
          const radius = 8 + Math.round((church.count / maxCount) * 16);
          return (
            <CircleMarker
              key={church.id}
              center={[church.latitude, church.longitude]}
              radius={radius}
              pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.55, weight: 2 }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">{church.name}</p>
                  {church.city && <p className="text-xs text-zinc-500">{church.city}</p>}
                  <p className="mt-1 font-semibold text-orange-600">
                    {church.count} legendário{church.count === 1 ? '' : 's'}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
          <div className="pointer-events-auto rounded-lg border border-zinc-700 bg-zinc-900/90 px-4 py-3 text-center text-sm text-zinc-300 shadow-lg">
            <p className="font-semibold">Nenhuma igreja com coordenadas ainda.</p>
            <p className="mt-1 text-xs text-zinc-500">
              Cadastre latitude e longitude nas igrejas para ver os pontos no mapa.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
