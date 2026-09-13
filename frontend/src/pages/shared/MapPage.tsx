import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Crosshair, Fuel, Map as MapIcon, Package, Target, Truck } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { useMapData } from '../../hooks/queries';
import { Badge, Card, ErrorState, PageHeader, Skeleton, StatusBadge } from '../../components/ui';
import { DieselMap } from '../../components/map/DieselMap';
import { VERIFICATION_STATUS, formatDate, formatLiters, formatPrice } from '../../lib/format';
import type { DemandView, MapConnection, OfferView } from '../../types';

type Layer = 'offers' | 'demands' | 'connections' | 'carriers';
type Selection = { kind: 'offer'; item: OfferView } | { kind: 'demand'; item: DemandView } | null;

const LAYERS: Array<{ key: Layer; label: string; icon: typeof Fuel; color: string }> = [
  { key: 'offers', label: 'Ofertas', icon: Fuel, color: 'bg-brand-600' },
  { key: 'demands', label: 'Demandas', icon: Package, color: 'bg-red-600' },
  { key: 'connections', label: 'Matches', icon: Target, color: 'bg-fuel-500' },
  { key: 'carriers', label: 'Transportistas', icon: Truck, color: 'bg-blue-600' },
];

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

function SelectionPanel({ selection, canOpenOffer }: { selection: Selection; canOpenOffer: boolean }) {
  if (!selection) {
    return <p className="text-sm text-slate-500">Selecciona un punto en el mapa para ver su detalle.</p>;
  }
  if (selection.kind === 'offer') {
    const o = selection.item;
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Oferta</p>
        <p className="text-base font-semibold text-slate-900">{o.supplier?.business_name ?? 'Proveedor'}</p>
        <Row label="Volumen" value={formatLiters(o.remaining_liters)} />
        <Row label="Precio" value={formatPrice(o.price_per_liter)} />
        <Row label="Disponibilidad" value={formatDate(o.available_date)} />
        <Row label="Ubicación" value={o.location_name} />
        {o.supplier && <StatusBadge map={VERIFICATION_STATUS} value={o.supplier.verification_status} />}
        {canOpenOffer && (
          <Link to="/app/offers" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            Ver ofertas <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    );
  }
  const d = selection.item;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Demanda</p>
      <p className="text-base font-semibold text-slate-900">{d.producer?.organization_name ?? 'Productor'}</p>
      <Row label="Litros solicitados" value={formatLiters(d.remaining_liters)} />
      <Row label="Fecha" value={formatDate(d.required_date)} />
      <Row label="Actividad" value={d.activity_type} />
      <Row label="Ubicación" value={d.location_name} />
      <Link to={`/app/demands/${d.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
        Ver demanda <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function ConnectionList({ connections, highlight, onHighlight }: { connections: MapConnection[]; highlight: string | null; onHighlight: (id: string | null) => void }) {
  if (connections.length === 0) return <p className="text-sm text-slate-500">No hay matches activos.</p>;
  return (
    <ul className="space-y-2">
      {connections.map((c) => {
        const active = highlight === c.match_id;
        return (
          <li key={c.match_id} className={clsx('rounded-xl border p-3 text-sm transition', active ? 'border-fuel-300 bg-fuel-50' : 'border-slate-100 bg-slate-50/60')}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{c.destination?.name}</p>
                <p className="text-xs text-slate-500">
                  {c.origins.map((o) => `${o.name} (${formatLiters(o.liters)})`).join(' + ')}
                </p>
              </div>
              <Badge tone="yellow">{c.score}</Badge>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">{c.operation_code ?? 'Propuesto'} · {formatLiters(c.total_liters)}</span>
              <button onClick={() => onHighlight(active ? null : c.match_id)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                <Crosshair className="h-3.5 w-3.5" /> {active ? 'Quitar' : 'Resaltar'}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function MapPage() {
  const { role } = useAuth();
  const { data, isLoading, isError, refetch } = useMapData();
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ offers: true, demands: true, connections: true, carriers: true });
  const [selection, setSelection] = useState<Selection>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  const counts = useMemo<Record<Layer, number>>(
    () => ({ offers: data?.offers.length ?? 0, demands: data?.demands.length ?? 0, connections: data?.connections.length ?? 0, carriers: data?.carriers.length ?? 0 }),
    [data],
  );
  const toggle = (k: Layer) => setLayers((l) => ({ ...l, [k]: !l[k] }));
  const mapClass = 'h-[calc(100vh-14rem)] min-h-[480px]';

  return (
    <div>
      <PageHeader title="Mapa del mercado" description="Ofertas, demandas, matches y transportistas sobre OpenStreetMap. Las rutas son representaciones aproximadas." />
      <div className="mb-4 flex flex-wrap gap-2">
        {LAYERS.map((l) => (
          <button
            key={l.key}
            onClick={() => toggle(l.key)}
            className={clsx(
              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition',
              layers[l.key] ? 'bg-white text-slate-800 ring-slate-300 shadow-sm' : 'bg-slate-100 text-slate-400 ring-transparent',
            )}
          >
            <span className={clsx('h-2.5 w-2.5 rounded-full', l.color, !layers[l.key] && 'opacity-30')} />
            <l.icon className="h-3.5 w-3.5" />
            {l.label} <span className="opacity-70">({counts[l.key]})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <Skeleton className={mapClass} />
          <Skeleton className="h-96" />
        </div>
      ) : isError || !data ? (
        <ErrorState retry={() => void refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <DieselMap
            className={mapClass}
            offers={layers.offers ? data.offers : []}
            demands={layers.demands ? data.demands : []}
            carriers={layers.carriers ? data.carriers : []}
            connections={layers.connections ? data.connections : []}
            highlightMatchId={highlight}
            onSelectOffer={(o) => setSelection({ kind: 'offer', item: o })}
            onSelectDemand={(d) => setSelection({ kind: 'demand', item: d })}
          />
          <div className="space-y-4">
            <Card className="p-4">
              <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <MapIcon className="h-4 w-4 text-brand-600" /> Detalle
              </p>
              <SelectionPanel selection={selection} canOpenOffer={role === 'admin' || role === 'supplier'} />
            </Card>
            <Card className="p-4">
              <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Target className="h-4 w-4 text-fuel-600" /> Matches activos
              </p>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                <ConnectionList connections={data.connections} highlight={highlight} onHighlight={setHighlight} />
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
