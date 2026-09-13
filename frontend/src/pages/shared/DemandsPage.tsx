import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, PlusCircle, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useDemands, useUpdateDemand } from '../../hooks/queries';
import { Button, DataTable, EmptyState, ErrorState, PageHeader, SkeletonTable, StatusBadge } from '../../components/ui';
import type { Column } from '../../components/ui';
import { DEMAND_STATUS, formatDate, formatKm, formatLiters, formatPrice, relativeTime } from '../../lib/format';
import type { DemandStatus, DemandView } from '../../types';

const STATUSES = Object.keys(DEMAND_STATUS) as DemandStatus[];

function FilterChips({ value, onChange, counts }: { value: DemandStatus | 'ALL'; onChange: (v: DemandStatus | 'ALL') => void; counts: Record<string, number> }) {
  const chips: Array<{ key: DemandStatus | 'ALL'; label: string }> = [{ key: 'ALL', label: 'Todas' }, ...STATUSES.map((s) => ({ key: s, label: DEMAND_STATUS[s].label }))];
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {chips.map((c) => {
        const n = c.key === 'ALL' ? counts.ALL : counts[c.key] ?? 0;
        if (c.key !== 'ALL' && n === 0) return null;
        return (
          <button
            key={c.key}
            onClick={() => onChange(c.key)}
            className={clsx(
              'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition',
              value === c.key ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
            )}
          >
            {c.label} <span className="opacity-70">({n})</span>
          </button>
        );
      })}
    </div>
  );
}

export default function DemandsPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useDemands();
  const update = useUpdateDemand();
  const [filter, setFilter] = useState<DemandStatus | 'ALL'>('ALL');

  const isProducer = role === 'producer';
  const isSupplier = role === 'supplier';
  const title = isProducer ? 'Mis demandas' : isSupplier ? 'Demandas compatibles' : 'Todas las demandas';
  const description = isProducer
    ? 'Tus solicitudes de diésel y su estado en el mercado.'
    : isSupplier
      ? 'Demandas abiertas dentro de tu radio de cobertura. Ordenadas por cercanía a tu ubicación.'
      : 'Todas las demandas publicadas en la plataforma.';

  const rows = useMemo(() => (data ?? []).filter((d) => filter === 'ALL' || d.status === filter), [data, filter]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: data?.length ?? 0 };
    for (const d of data ?? []) c[d.status] = (c[d.status] ?? 0) + 1;
    return c;
  }, [data]);

  const cancel = (d: DemandView) => {
    if (!window.confirm(`¿Cancelar la demanda de ${formatLiters(d.requested_liters)} en ${d.location_name}?`)) return;
    update.mutate(
      { id: d.id, status: 'CANCELLED' },
      { onSuccess: () => toast.success('Demanda cancelada'), onError: (e) => toast.error(e.message) },
    );
  };

  const columns: Column<DemandView>[] = [
    ...(!isProducer
      ? [
          {
            key: 'producer',
            header: 'Productor',
            render: (d: DemandView) => (
              <div>
                <p className="font-medium text-slate-900">{d.producer?.organization_name ?? '—'}</p>
                <p className="text-xs text-slate-500">{d.producer?.contact_name}</p>
              </div>
            ),
          },
        ]
      : []),
    {
      key: 'liters',
      header: 'Volumen',
      render: (d) => (
        <div>
          <p className="font-semibold text-slate-900">{formatLiters(d.requested_liters)}</p>
          {d.remaining_liters !== d.requested_liters && <p className="text-xs text-slate-500">Pendiente {formatLiters(d.remaining_liters)}</p>}
        </div>
      ),
    },
    { key: 'location', header: 'Ubicación', render: (d) => d.location_name },
    ...(isSupplier ? [{ key: 'distance', header: 'Distancia', render: (d: DemandView) => (d.distance_km !== undefined ? formatKm(d.distance_km) : '—') }] : []),
    { key: 'date', header: 'Fecha requerida', render: (d) => formatDate(d.required_date) },
    { key: 'activity', header: 'Actividad', render: (d) => d.activity_type },
    { key: 'price', header: 'Precio objetivo', render: (d) => (d.target_price ? formatPrice(d.target_price) : '—') },
    { key: 'status', header: 'Estado', render: (d) => <StatusBadge map={DEMAND_STATUS} value={d.status} /> },
    { key: 'created', header: 'Creada', render: (d) => <span className="text-slate-500">{relativeTime(d.created_at)}</span> },
    ...(isProducer
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            render: (d: DemandView) =>
              d.status === 'OPEN' ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cancel(d);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-600"
                >
                  <XCircle className="h-3.5 w-3.5" /> Cancelar
                </button>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          isProducer ? (
            <Link to="/app/demands/new">
              <Button variant="accent" icon={<PlusCircle className="h-4 w-4" />}>
                Nueva demanda
              </Button>
            </Link>
          ) : undefined
        }
      />
      {isLoading ? (
        <SkeletonTable />
      ) : isError ? (
        <ErrorState retry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title={isSupplier ? 'No hay demandas compatibles por ahora' : 'Aún no hay demandas'}
          description={isProducer ? 'Publica cuántos litros necesitas y el motor buscará las mejores ofertas.' : 'Cuando se publiquen demandas aparecerán aquí.'}
          action={
            isProducer ? (
              <Link to="/app/demands/new">
                <Button variant="accent" icon={<PlusCircle className="h-4 w-4" />}>
                  Publicar demanda
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <FilterChips value={filter} onChange={setFilter} counts={counts} />
          <DataTable columns={columns} rows={rows} onRowClick={(d) => navigate(`/app/demands/${d.id}`)} emptyMessage="No hay demandas con este estado" />
        </>
      )}
    </div>
  );
}
