import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useConfig } from '../../hooks/queries';
import { Field, Select } from '../ui/Field';

const icon = L.divIcon({
  html: '<span style="display:block;width:22px;height:22px;border-radius:9999px;background:#dc2626;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"></span>',
  className: 'dp2p-marker',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export interface LocationValue {
  location_name: string;
  latitude: number;
  longitude: number;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Selector de ubicación: zona predefinida + ajuste fino con clic en el mapa. */
export function LocationPicker({ value, onChange, color = 'demand' }: { value: LocationValue; onChange: (v: LocationValue) => void; color?: 'demand' | 'offer' }) {
  const { data: config } = useConfig();
  const zones = config?.zones ?? [];
  const markerIcon =
    color === 'offer'
      ? L.divIcon({ html: '<span style="display:block;width:22px;height:22px;border-radius:9999px;background:#178a4a;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"></span>', className: 'dp2p-marker', iconSize: [22, 22], iconAnchor: [11, 11] })
      : icon;
  return (
    <div className="space-y-3">
      <Field label="Zona" hint="Coordenadas aproximadas y ficticias. Haz clic en el mapa para ajustar.">
        <Select
          value={zones.some((z) => z.name === value.location_name) ? value.location_name : ''}
          onChange={(e) => {
            const z = zones.find((x) => x.name === e.target.value);
            if (z) onChange({ location_name: z.name, latitude: z.latitude, longitude: z.longitude });
          }}
        >
          <option value="" disabled>
            Selecciona una zona
          </option>
          {zones.map((z) => (
            <option key={z.name} value={z.name}>
              {z.name} · {z.department}
            </option>
          ))}
        </Select>
      </Field>
      <div className="h-56 overflow-hidden rounded-xl border border-slate-200">
        <MapContainer key={value.location_name} center={[value.latitude, value.longitude]} zoom={9} className="h-full w-full" scrollWheelZoom={false}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickHandler onPick={(lat, lng) => onChange({ ...value, latitude: lat, longitude: lng })} />
          <Marker position={[value.latitude, value.longitude]} icon={markerIcon} />
        </MapContainer>
      </div>
      <p className="text-xs text-slate-500">
        {value.location_name} · {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
      </p>
    </div>
  );
}
