import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker } from 'react-leaflet';
import L, { type LatLngBoundsExpression, type LatLngExpression } from 'leaflet';
import clsx from 'clsx';
import type { CarrierSummary, DemandView, MapConnection, OfferView } from '../../types';
import { formatDate, formatKm, formatLiters, formatPrice } from '../../lib/format';

/**
 * Mapa central de DieselP2P (OpenStreetMap + Leaflet).
 * 🟢 ofertas · 🔴 demandas · 🟡 matches (líneas proveedor → productor) · 🔵 transportistas
 */

const COLORS = { offer: '#178a4a', demand: '#dc2626', match: '#f5b400', carrier: '#2563eb' };

function pinIcon(color: string, size = 28, pulse = false) {
  const html = `
    <div style="position:relative;width:${size}px;height:${size}px;">
      ${pulse ? `<span style="position:absolute;inset:-6px;border-radius:9999px;background:${color};opacity:.25;animation:dp2p-pulse 1.8s ease-out infinite"></span>` : ''}
      <span style="position:absolute;inset:0;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25)"></span>
    </div>`;
  return L.divIcon({ html, className: 'dp2p-marker', iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2] });
}

const icons = {
  offer: pinIcon(COLORS.offer, 22),
  demand: pinIcon(COLORS.demand, 22),
  demandActive: pinIcon(COLORS.demand, 28, true),
  carrier: pinIcon(COLORS.carrier, 20),
  originActive: pinIcon(COLORS.offer, 28, true),
};

if (typeof document !== 'undefined' && !document.getElementById('dp2p-map-style')) {
  const style = document.createElement('style');
  style.id = 'dp2p-map-style';
  style.textContent = `@keyframes dp2p-pulse{0%{transform:scale(.6);opacity:.5}100%{transform:scale(1.8);opacity:0}}`;
  document.head.appendChild(style);
}

/** Curva suave (cuadrática) entre dos puntos para representar una ruta aproximada. */
function curve(a: [number, number], b: [number, number], segments = 24): LatLngExpression[] {
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dx = b[1] - a[1];
  const dy = b[0] - a[0];
  const ctrl: [number, number] = [mid[0] + dx * 0.15, mid[1] - dy * 0.15];
  const pts: LatLngExpression[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * ctrl[0] + t ** 2 * b[0];
    const lng = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * ctrl[1] + t ** 2 * b[1];
    pts.push([lat, lng]);
  }
  return pts;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 9);
      return;
    }
    map.fitBounds(points as LatLngBoundsExpression, { padding: [40, 40], maxZoom: 11 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export interface DieselMapProps {
  offers?: OfferView[];
  demands?: DemandView[];
  carriers?: CarrierSummary[];
  connections?: MapConnection[];
  /** Id de match a resaltar (líneas más gruesas y animadas). */
  highlightMatchId?: string | null;
  className?: string;
  fit?: boolean;
  center?: [number, number];
  zoom?: number;
  showLegend?: boolean;
  onSelectOffer?: (o: OfferView) => void;
  onSelectDemand?: (d: DemandView) => void;
}

export function DieselMap({
  offers = [],
  demands = [],
  carriers = [],
  connections = [],
  highlightMatchId,
  className,
  fit = true,
  center = [-17.6, -63.2],
  zoom = 7,
  showLegend = true,
  onSelectOffer,
  onSelectDemand,
}: DieselMapProps) {
  const fitPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    const highlighted = highlightMatchId ? connections.filter((c) => c.match_id === highlightMatchId) : [];
    if (highlighted.length > 0) {
      for (const c of highlighted) {
        if (c.destination) pts.push([c.destination.latitude, c.destination.longitude]);
        for (const o of c.origins) pts.push([o.latitude, o.longitude]);
      }
      return pts;
    }
    for (const o of offers) pts.push([o.latitude, o.longitude]);
    for (const d of demands) pts.push([d.latitude, d.longitude]);
    for (const c of carriers) pts.push([c.latitude, c.longitude]);
    for (const c of connections) {
      if (c.destination) pts.push([c.destination.latitude, c.destination.longitude]);
      for (const o of c.origins) pts.push([o.latitude, o.longitude]);
    }
    return pts;
  }, [offers, demands, carriers, connections, highlightMatchId]);

  return (
    <div className={clsx('relative overflow-hidden rounded-2xl border border-slate-200', className)}>
      <MapContainer center={center} zoom={zoom} className="h-full w-full" scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {fit && <FitBounds points={fitPoints} />}

        {offers.map((o) => (
          <Marker key={`o-${o.id}`} position={[o.latitude, o.longitude]} icon={icons.offer} eventHandlers={onSelectOffer ? { click: () => onSelectOffer(o) } : undefined}>
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold text-brand-700">{o.supplier?.business_name ?? 'Proveedor'}</p>
                <p className="text-xs text-slate-500">{o.location_name} · Proveedor verificado (demo)</p>
                <p><span className="text-slate-500">Volumen:</span> {formatLiters(o.remaining_liters)}</p>
                <p><span className="text-slate-500">Precio:</span> {formatPrice(o.price_per_liter)}</p>
                <p><span className="text-slate-500">Disponible:</span> {formatDate(o.available_date)}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {demands.map((d) => (
          <Marker key={`d-${d.id}`} position={[d.latitude, d.longitude]} icon={icons.demand} eventHandlers={onSelectDemand ? { click: () => onSelectDemand(d) } : undefined}>
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold text-red-600">{d.producer?.organization_name ?? 'Productor'}</p>
                <p className="text-xs text-slate-500">{d.location_name}</p>
                <p><span className="text-slate-500">Solicita:</span> {formatLiters(d.remaining_liters)}</p>
                <p><span className="text-slate-500">Fecha:</span> {formatDate(d.required_date)}</p>
                <p><span className="text-slate-500">Actividad:</span> {d.activity_type}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {carriers.map((c) => (
          <Marker key={`c-${c.id}`} position={[c.latitude, c.longitude]} icon={icons.carrier}>
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold text-blue-700">{c.company_name}</p>
                <p className="text-xs text-slate-500">{c.vehicle_type}</p>
                <p><span className="text-slate-500">Capacidad:</span> {formatLiters(c.capacity_liters)}</p>
                <p><span className="text-slate-500">Cobertura:</span> {c.coverage_area}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {connections.map((c) => {
          if (!c.destination) return null;
          const active = highlightMatchId === c.match_id;
          const dest: [number, number] = [c.destination.latitude, c.destination.longitude];
          return (
            <div key={`m-${c.match_id}`}>
              {c.origins.map((o, idx) => (
                <div key={idx}>
                  <Polyline
                    positions={curve([o.latitude, o.longitude], dest)}
                    pathOptions={{ color: COLORS.match, weight: active ? 5 : 3, opacity: active ? 0.95 : 0.7, dashArray: active ? '10 8' : undefined, className: active ? 'animate-dash' : undefined }}
                  />
                  <Marker position={[o.latitude, o.longitude]} icon={active ? icons.originActive : icons.offer}>
                    <Popup>
                      <p className="font-semibold text-brand-700">{o.name}</p>
                      <p>{formatLiters(o.liters)} · {formatKm(o.distance_km)}</p>
                    </Popup>
                  </Marker>
                </div>
              ))}
              <Marker position={dest} icon={active ? icons.demandActive : icons.demand}>
                <Popup>
                  <p className="font-semibold text-red-600">{c.destination.name}</p>
                  <p>{formatLiters(c.total_liters)} · Score {c.score}/100</p>
                  {c.operation_code && <p className="text-xs text-slate-500">{c.operation_code}</p>}
                </Popup>
              </Marker>
              <CircleMarker center={dest} radius={active ? 18 : 12} pathOptions={{ color: COLORS.match, weight: 2, fillOpacity: 0.08 }} />
            </div>
          );
        })}
      </MapContainer>

      {showLegend && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex flex-wrap gap-2 rounded-xl bg-white/90 px-3 py-2 text-xs shadow-card backdrop-blur">
          <LegendItem color={COLORS.offer} label="Ofertas" />
          <LegendItem color={COLORS.demand} label="Demandas" />
          <LegendItem color={COLORS.match} label="Matches" />
          <LegendItem color={COLORS.carrier} label="Transportistas" />
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-600">
      <span className="h-2.5 w-2.5 rounded-full border border-white shadow" style={{ background: color }} />
      {label}
    </span>
  );
}
