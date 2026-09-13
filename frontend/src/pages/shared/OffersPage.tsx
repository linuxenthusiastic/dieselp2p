import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Fuel, Plus, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { useOffers, useUpdateOffer } from '../../hooks/queries';
import { Button, DataTable, EmptyState, ErrorState, PageHeader, SkeletonTable, StatusBadge, type Column } from '../../components/ui';
import { formatDate, formatLiters, formatPrice, OFFER_STATUS } from '../../lib/format';
import type { OfferStatus, OfferView } from '../../types';

const FILTERS: Array<{ key: OfferStatus | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'Todas' },
  { key: 'ACTIVE', label: 'Activas' },
  { key: 'PARTIALLY_ALLOCATED', label: 'Parciales' },
  { key: 'FULLY_ALLOCATED', label: 'Asignadas' },
  { key: 'CANCELLED', label: 'Canceladas' },
];

export default function OffersPage() {
  const { role } = useAuth();
  const isSupplier = role === 'supplier';
  const offers = useOffers();
  const update = useUpdateOffer();
  const [filter, setFilter] = useState<OfferStatus | 'ALL'>('ALL');

  const rows = (offers.data ?? []).filter((o) => filter === 'ALL' || o.status === filter);

  const cancel = async (o: OfferView) => {
    if (!window.confirm(`¿Cancelar la oferta de ${formatLiters(o.available_liters)} en ${o.location_name}?`)) return;
    try {
      await update.mutateAsync({ id: o.id, status: 'CANCELLED' });
      toast.success('Oferta cancelada');
    } catch {
      toast.error('No se pudo cancelar la oferta');
    }
  };

  const columns: Column<OfferView>[] = [
    ...(isSupplier
      ? []
      : [{ key: 'supplier', header: 'Proveedor', render: (o: OfferView) => <span className="font-medium text-slate-900">{o.supplier?.business_name ?? '—'}</span> }]),
    { key: 'location', header: 'Ubicación', render: (o) => o.location_name },
    { key: 'volume', header: 'Volumen', render: (o) => <VolumeCell offer={o} /> },
    { key: 'price', header: 'Precio', align: 'right', render: (o) => <span className="tabular-nums">{formatPrice(o.price_per_liter)}</span> },
    { key: 'date', header: 'Disponible desde', render: (o) => formatDate(o.available_date) },
    { key: 'status', header: 'Estado', render: (o) => <StatusBadge map={OFFER_STATUS} value={o.status} /> },
    ...(isSupplier
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            render: (o: OfferView) =>
              o.status === 'ACTIVE' ? (
                <Button size="sm" variant="ghost" onClick={() => void cancel(o)} loading={update.isPending && update.variables?.id === o.id} icon={<XCircle className="h-3.5 w-3.5" />}>
                  Cancelar
                </Button>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isSupplier ? 'Proveedor' : 'Administración'}
        title={isSupplier ? 'Mis ofertas' : 'Ofertas'}
        description={isSupplier ? 'Volumen que publicaste y su estado de asignación.' : 'Todas las ofertas de proveedores verificados (simulación).'}
        actions={
          isSupplier ? (
            <Link to="/app/offers/new">
              <Button variant="accent" icon={<Plus className="h-4 w-4" />}>Nueva oferta</Button>
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={clsx('rounded-full px-3 py-1 text-xs font-medium transition', filter === f.key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {offers.isLoading ? (
        <SkeletonTable />
      ) : offers.isError ? (
        <ErrorState retry={() => void offers.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Fuel className="h-6 w-6" />}
          title="Sin ofertas"
          description={isSupplier ? 'Publica tu primera oferta para participar en el matching.' : 'No hay ofertas con este filtro.'}
          action={isSupplier ? <Link to="/app/offers/new"><Button variant="accent" size="sm">Nueva oferta</Button></Link> : undefined}
        />
      ) : (
        <DataTable columns={columns} rows={rows} />
      )}
    </div>
  );
}

function VolumeCell({ offer }: { offer: OfferView }) {
  const pct = offer.available_liters > 0 ? Math.round((offer.remaining_liters / offer.available_liters) * 100) : 0;
  return (
    <div className="min-w-[140px]">
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-slate-900">{formatLiters(offer.remaining_liters)}</span>
        <span className="text-slate-400">de {formatLiters(offer.available_liters)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
